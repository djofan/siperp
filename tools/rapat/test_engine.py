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
    def test_part_validation_and_cleanup_and_silent_windows(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_AUDIO_ROOTS=root, RAPAT_WHISPER_MODEL='small'), patch.object(e,'model_ready',return_value=True):
            f=Path(root)/'audio';f.write_bytes(b'compressed')
            for invalid in [{'startSeconds':-1},{'startSeconds':True},{'chunkSeconds':901},{'chunkSeconds':0}]:
                with self.assertRaises(e.Failure):e.transcribe_part({'file':str(f),**invalid})
            with patch.object(e,'decode_window',return_value=(900,True)) as decode, patch.object(e,'recognize',side_effect=e.Failure('no_usable_speech')):
                r=e.transcribe_part({'file':str(f),'startSeconds':900})
                self.assertEqual(r,dict(text='',segments=[],startSeconds=900,durationSeconds=900,hasMore=True))
                self.assertEqual(decode.call_args.args[2:],(900,900))
            self.assertEqual(list(Path(root).iterdir()),[f])
            with patch.object(e,'decode_window',side_effect=RuntimeError('PRIVATE internal decoder path')):
                with self.assertRaisesRegex(e.Failure,'^audio_decode_failed$'):e.transcribe_part({'file':str(f)})
            self.assertEqual(list(Path(root).iterdir()),[f])

    def test_streaming_decoder_preserves_window_boundaries(self):
        try:
            import av
        except ImportError:
            self.skipTest('PyAV runtime required for streaming decoder test')
        import wave
        import array
        with tempfile.TemporaryDirectory() as root:
            source=Path(root)/'source.wav'
            samples=array.array('h',[1000]*16000+[2000]*16000+[3000]*8000)
            with wave.open(str(source),'wb') as w:
                w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(samples.tobytes())
            for start,length,more,expected in [(0,1,True,1000),(1,1,True,2000),(2,.5,False,3000)]:
                out=Path(root)/f'{start}.wav'
                self.assertEqual(e.decode_window(source,out,start,1),(length,more))
                with wave.open(str(out),'rb') as w:
                    actual=array.array('h',w.readframes(w.getnframes()))
                    self.assertEqual(len(actual),int(length*16000));self.assertTrue(all(v==expected for v in actual))

    def test_health_whisper_only_without_network_or_download(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_MODEL_DIR=root):
            self.assertEqual(e.health(), dict(transcriberReady=False, summarizerReady=False, provider='local'))
            self.assertEqual(list(Path(root).iterdir()), [])
        with patch.object(e, 'model_ready', return_value=True), patch.object(e.importlib.util, 'find_spec', return_value=object()):
            self.assertEqual(e.health(), dict(transcriberReady=True, summarizerReady=False, provider='local'))

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
            self.assertEqual(constructor.call_args.kwargs['cpu_threads'], 2)
            self.assertEqual(constructor.call_args.kwargs['num_workers'], 1)
            self.assertTrue(constructor.call_args.kwargs['local_files_only'])
            options = model.transcribe.call_args.kwargs
            self.assertEqual(options['language'], 'id')
            self.assertEqual(options['task'], 'transcribe')
            self.assertEqual(options['temperature'], 0)
            self.assertTrue(options['word_timestamps'])
            self.assertTrue(options['vad_filter'])
            self.assertFalse(options['condition_on_previous_text'])
            self.assertEqual(options['hallucination_silence_threshold'], 2)

    def test_transcriber_failures_have_safe_stage_codes(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ, RAPAT_AUDIO_ROOTS=root), \
                patch.object(e, 'model_ready', return_value=True):
            f = Path(root) / 'audio'
            f.write_bytes(b'audio')
            with patch.dict(sys.modules, faster_whisper=None):
                with self.assertRaisesRegex(e.Failure, '^transcriber_dependency_missing$'):
                    e.transcribe({'file': str(f)})
            constructor = unittest.mock.Mock(side_effect=RuntimeError('PRIVATE path and internal error'))
            with patch.dict(sys.modules, faster_whisper=types.SimpleNamespace(WhisperModel=constructor)):
                with self.assertRaisesRegex(e.Failure, '^whisper_model_load_failed$'):
                    e.transcribe({'file': str(f)})
            decoder_error = type('InvalidDataError', (Exception,), {'__module__': 'av.error'})
            for error, expected in [(decoder_error('PRIVATE data'), 'audio_decode_failed'),
                                    (RuntimeError('PRIVATE data'), 'transcription_failed')]:
                def segments():
                    raise error
                    yield
                model = unittest.mock.Mock()
                model.transcribe.return_value = (segments(), None)
                with patch.dict(sys.modules, faster_whisper=types.SimpleNamespace(WhisperModel=lambda *a, **k: model)):
                    with self.assertRaisesRegex(e.Failure, '^' + expected + '$'):
                        e.transcribe({'file': str(f)})

    def test_default_small_and_explicit_large_and_turbo_cache_variants(self):
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
                self.assertEqual(e.model_path().name, 'small')
                self.assertEqual(e.MODEL_REPOS[e.model_path().name], 'Systran/faster-whisper-small')
                path = e.model_path()
                path.mkdir()
                for name in e.MODEL_FILES:
                    (path / name).write_bytes(b'file')
                self.assertFalse(e.model_ready())
                (path / 'vocabulary.txt').write_bytes(b'vocabulary')
                self.assertTrue(e.model_ready())
            with patch.dict(os.environ, RAPAT_WHISPER_MODEL='large-v3'):
                self.assertEqual(e.model_path().name, 'large-v3')

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

    def test_removed_minutes_cli_never_uses_transcript_or_network(self):
        with self.assertRaisesRegex(e.Failure, 'invalid_command'):
            e.dispatch('minutes', {'transcript': 'SECRET'})
        run = subprocess.run([sys.executable, str(Path(e.__file__)), 'minutes'],
                             input=b'{"transcript":"SECRET", "meeting":[]}', capture_output=True)
        self.assertEqual(run.returncode, 1)
        self.assertNotIn(b'SECRET', run.stdout + run.stderr)
        self.assertEqual(run.stderr, b'')
        self.assertIn('error', json.loads(run.stdout))


if __name__ == '__main__':
    unittest.main()
