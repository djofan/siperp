import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import engine as e


class EngineTests(unittest.TestCase):
    def test_urls(self):
        for url in ['https://example.com', 'http://127.0.0.1@evil.com',
                    'http://localhost/x', 'http://localhost?x=1', 'file:///tmp/a',
                    'http://192.168.1.1', 'http://localhost:bad']:
            with self.subTest(url=url), patch.dict(os.environ, RAPAT_OLLAMA_URL=url):
                with self.assertRaises(e.Failure):
                    e.ollama_url()
        for url in ['http://127.0.0.1:11434', 'http://[::1]:11434', 'http://localhost:11434']:
            with patch.dict(os.environ, RAPAT_OLLAMA_URL=url):
                self.assertIn(':11434', e.ollama_url())

    def test_health_no_download_and_remote_model(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_MODEL_DIR=root), \
                patch.object(e, 'request_ollama', return_value={'models': []}) as req:
            self.assertEqual(e.health(), dict(transcriberReady=False, summarizerReady=False, provider='local'))
            self.assertEqual(list(Path(root).iterdir()), [])
            req.assert_called_once_with('/api/tags')
        with patch.object(e, 'request_ollama', return_value={'models': [
                {'name': e.ollama_model(), 'remote_host': 'https://cloud'}]}):
            self.assertFalse(e.health()['summarizerReady'])

    def test_file_boundaries(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as other, \
                patch.dict(os.environ, RAPAT_AUDIO_ROOTS=root):
            file = Path(root) / 'random'
            file.write_bytes(b'audio')
            self.assertEqual(e.audio_file(str(file)), file.resolve())
            for value in ['relative', str(Path(other)), str(Path(root) / 'missing')]:
                with self.assertRaises((e.Failure, FileNotFoundError)):
                    e.audio_file(value)
            with file.open('wb') as stream:
                stream.truncate(e.MAX_FILE + 1)
            with self.assertRaises(e.Failure):
                e.audio_file(str(file))

    def test_fake_whisper_extensionless(self):
        model = unittest.mock.Mock()
        model.transcribe.return_value = ([types.SimpleNamespace(start=0, end=1.5, text=' Rapat dimulai. ')], None)
        constructor = unittest.mock.Mock(return_value=model)
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_AUDIO_ROOTS=root), \
                patch.object(e, 'model_ready', return_value=True), \
                patch.dict(sys.modules, faster_whisper=types.SimpleNamespace(WhisperModel=constructor)):
            f = Path(root) / 'randomtemp'
            f.write_bytes(b'audio')
            result = e.transcribe({'file': str(f), 'language': 'id'})
            self.assertEqual(result['segments'][0]['speaker'], None)
            self.assertEqual(result['text'], 'Rapat dimulai.')
            self.assertEqual(constructor.call_args.kwargs['compute_type'], 'int8')
            self.assertTrue(constructor.call_args.kwargs['local_files_only'])
            options = model.transcribe.call_args.kwargs
            self.assertEqual(options['language'], 'id')
            self.assertEqual(options['task'], 'transcribe')
            self.assertEqual(options['temperature'], 0)
            self.assertTrue(options['word_timestamps'])
            self.assertTrue(options['vad_filter'])
            self.assertFalse(options['condition_on_previous_text'])
            self.assertEqual(options['hallucination_silence_threshold'], 2)

    def test_default_full_large_and_turbo_cache_variants(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_MODEL_DIR=root):
            with patch.dict(os.environ, RAPAT_WHISPER_MODEL='large-v3-turbo'):
                path = e.model_path()
                path.mkdir()
                for name in e.MODEL_FILES:
                    (path / name).write_bytes(b'file')
                (path / 'preprocessor_config.json').write_bytes(b'config')
                self.assertFalse(e.model_ready())
                for vocabulary in ('vocabulary.json', 'vocabulary.txt'):
                    (path / vocabulary).write_bytes(b'vocabulary')
                    self.assertTrue(e.model_ready())
                    (path / vocabulary).unlink()
                (path / 'vocabulary.json').write_bytes(b'vocabulary')
                (path / 'preprocessor_config.json').unlink()
                self.assertFalse(e.model_ready())
            with patch.dict(os.environ):
                os.environ.pop('RAPAT_WHISPER_MODEL', None)
                self.assertEqual(e.model_path().name, 'large-v3')
                self.assertEqual(e.MODEL_REPOS[e.model_path().name], 'Systran/faster-whisper-large-v3')

    def test_setup_canonical_repo_and_optional_assets(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('rapat_setup', Path(e.__file__).with_name('setup.py'))
        setup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(setup)
        download = unittest.mock.Mock()
        with patch.dict(sys.modules, huggingface_hub=types.SimpleNamespace(snapshot_download=download)), \
                patch.dict(os.environ, RAPAT_WHISPER_MODEL='large-v3-turbo'), \
                patch.object(sys, 'argv', ['setup.py', 'download-model']), \
                patch.object(setup, 'model_ready', return_value=True), patch('builtins.print'):
            setup.main()
        self.assertEqual(download.call_args.kwargs['repo_id'], 'dropbox-dash/faster-whisper-large-v3-turbo')
        for name in ('preprocessor_config.json', 'vocabulary.json', 'vocabulary.txt'):
            self.assertIn(name, download.call_args.kwargs['allow_patterns'])

    def test_transcription_confidence_preserves_uncertain_content(self):
        model = unittest.mock.Mock()
        spoken = types.SimpleNamespace(start=0, end=2, text=' Ini English update, update. ',
                 avg_logprob=-1.2, no_speech_prob=0.7,
                 words=[types.SimpleNamespace(probability=0.35)])
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_AUDIO_ROOTS=root), \
                patch.object(e, 'model_ready', return_value=True), \
                patch.dict(sys.modules, faster_whisper=types.SimpleNamespace(WhisperModel=lambda *a, **k: model)):
            f = Path(root) / 'random'
            f.write_bytes(b'audio')
            model.transcribe.return_value = ([spoken], None)
            result = e.transcribe({'file': str(f)})
            self.assertEqual(result['text'], spoken.text.strip())
            self.assertEqual(result['stats']['lowConfidenceSegmentIndexes'], [0])
            self.assertEqual(result['stats']['avgWordProbability'], 0.35)
            self.assertEqual(result['warnings'], ['low_confidence_speech'])
            spoken.avg_logprob = float('nan')
            spoken.no_speech_prob = float('inf')
            spoken.words[0].probability = float('nan')
            model.transcribe.return_value = ([spoken], None)
            unknown = e.transcribe({'file': str(f)})
            self.assertIsNone(unknown['stats']['avgLogprob'])
            self.assertIsNone(unknown['stats']['avgWordProbability'])
            json.dumps(unknown, allow_nan=False)
            for segments in ([], [types.SimpleNamespace(start=0, end=1, text=' ... ')]):
                model.transcribe.return_value = (segments, None)
                with self.assertRaisesRegex(e.Failure, 'no_usable_speech'):
                    e.transcribe({'file': str(f)})

    def test_validation(self):
        notes = e.clean_notes({'summary': 12, 'discussion': [None, 'Bahasan'],
            'actions': [{'task': 'Kirim laporan', 'assignee': 'Budi', 'dueDate': '2026-11-30', 'status': 'done'},
                        {'task': 'Periksa', 'assignee': 'Fiktif', 'dueDate': '2026-02-30'}]},
                        'Budi kirim laporan 2026-11-30')
        self.assertEqual(notes['summary'], '')
        self.assertEqual(notes['discussion'], ['Bahasan'])
        self.assertEqual(notes['actions'][0]['status'], 'open')
        self.assertIsNone(notes['actions'][1]['assignee'])
        self.assertIsNone(notes['actions'][1]['dueDate'])

    def test_minutes_map_reduce(self):
        calls = []
        def fake(endpoint, payload):
            calls.append(payload)
            return {'done': True, 'response': json.dumps({'summary': 'Rapat membahas laporan.',
                                                        'discussion': ['Isi laporan.']})}
        with patch.object(e, 'health', return_value={'summarizerReady': True}), \
                patch.object(e, 'request_ollama', side_effect=fake):
            self.assertEqual(e.minutes({'transcript': 'a' * 25000})['summary'], 'Rapat membahas laporan.')
        self.assertEqual(len(calls), 5)
        self.assertTrue(all(c['options']['num_ctx'] == 8192 for c in calls))
        self.assertIn('TIDAK TEPERCAYA', calls[0]['system'])

    def test_missing_model_no_fallback(self):
        with patch.object(e, 'health', return_value={'summarizerReady': False}), \
                patch.object(e, 'generate') as generate:
            with self.assertRaises(e.Failure):
                e.minutes({'transcript': 'Rahasia'})
            generate.assert_not_called()

    def test_maximum_transcript_and_http_safety(self):
        with patch.object(e, 'health', return_value={'summarizerReady': True}), \
                patch.object(e, 'generate', return_value={'summary': 'Catatan', 'discussion': [],
                             'decisions': [], 'actions': []}) as generate:
            e.minutes({'transcript': 'a' * 200000})
            self.assertEqual(generate.call_count, 33)
        import requests
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.status_code = 302
        session = unittest.mock.MagicMock()
        session.__enter__.return_value = session
        session.request.return_value = response
        with patch.object(requests, 'Session', return_value=session):
            with self.assertRaises(e.Failure):
                e.request_ollama('/api/tags')
        self.assertFalse(session.trust_env)
        self.assertFalse(session.request.call_args.kwargs['allow_redirects'])

    def test_invalid_response(self):
        for response in [{'done': True, 'response': 'bad'}, {'done': False},
                         {'done': True, 'response': '[]'}, {'done': True, 'done_reason': 'length'}]:
            with patch.object(e, 'request_ollama', return_value=response):
                with self.assertRaises(e.Failure):
                    e.generate({}, '')

    def test_metadata_never_enters_model_prompt(self):
        with patch.object(e, 'request_ollama', return_value={'done': True, 'response': '{}'}) as request:
            e.generate({'transcript': 'Laporan.', 'meeting': {'agenda': 'PRIVATE_AGENDA'}}, 'Laporan.')
        prompt = request.call_args.args[1]['prompt']
        self.assertEqual(json.loads(prompt), {'transcript': 'Laporan.'})
        self.assertNotIn('PRIVATE_AGENDA', prompt)

    def test_summarizer_default_and_memory_controls(self):
        with patch.dict(os.environ):
            os.environ.pop('RAPAT_OLLAMA_MODEL', None)
            self.assertEqual(e.ollama_model(), 'qwen3.5:9b')
        with patch.dict(os.environ, RAPAT_OLLAMA_MODEL='qwen2.5:1.5b'), \
                patch.object(e, 'request_ollama', return_value={'done': True, 'response': '{}'}) as request:
            e.generate({'transcript': 'Laporan.'}, 'Laporan.')
        payload = request.call_args.args[1]
        self.assertEqual(payload['model'], 'qwen2.5:1.5b')
        self.assertIs(payload['think'], False)
        self.assertEqual(payload['keep_alive'], 0)
        self.assertEqual(payload['options']['num_ctx'], 8192)

    def test_empty_sections_use_uncertainty_summary(self):
        notes = e.clean_notes({'summary': 'Unsupported confident narrative.'}, '')
        self.assertEqual(notes['summary'], 'Transkrip belum memuat rincian pembahasan yang memadai.')

    def test_size_and_cli_safe_errors(self):
        with self.assertRaises(e.Failure):
            e.minutes({'transcript': 'a' * 200001})
        run = subprocess.run([sys.executable, str(Path(e.__file__)), 'minutes'],
                             input=b'{"transcript":"SECRET", "meeting":[]}', capture_output=True)
        self.assertEqual(run.returncode, 1)
        self.assertNotIn(b'SECRET', run.stdout + run.stderr)
        self.assertEqual(run.stderr, b'')
        self.assertIn('error', json.loads(run.stdout))


if __name__ == '__main__':
    unittest.main()
