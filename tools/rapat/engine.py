"""One JSON request per process. Runtime never downloads models."""
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import threading
import wave

MAX_FILE = 20 * 1024 * 1024
MAX_INPUT = 1200000
MODEL_FILES = ('model.bin', 'config.json', 'tokenizer.json')
MODEL_DOWNLOAD_FILES = MODEL_FILES + ('preprocessor_config.json', 'vocabulary.json', 'vocabulary.txt')
MODEL_REPOS = {name: 'Systran/faster-whisper-' + name for name in (
    'tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en', 'medium', 'medium.en',
    'large-v1', 'large-v2', 'large-v3')}
# Canonical destination of the installed registry's mobiuslabsgmbh repo redirect.
MODEL_REPOS['large-v3-turbo'] = 'dropbox-dash/faster-whisper-large-v3-turbo'


class Failure(Exception):
    pass


def model_path():
    name = os.environ.get('RAPAT_WHISPER_MODEL', 'small')
    if name not in MODEL_REPOS:
        raise Failure('invalid_model')
    root = Path(os.environ.get('RAPAT_MODEL_DIR', str(Path.home() / '.cache/rapat-models')))
    return root.resolve() / name


def model_ready():
    path = model_path()
    def present(name):
        return (path / name).is_file() and (path / name).stat().st_size > 0
    required = MODEL_FILES + (('preprocessor_config.json',) if path.name in ('large-v3', 'large-v3-turbo') else ())
    return all(present(f) for f in required) and any(
        present(f) for f in ('vocabulary.json', 'vocabulary.txt'))


def health():
    try:
        transcriber = importlib.util.find_spec('faster_whisper') is not None and model_ready()
    except Exception:
        transcriber = False
    return dict(transcriberReady=transcriber, summarizerReady=False, provider='local')


def audio_file(value):
    if not isinstance(value, str) or not Path(value).is_absolute():
        raise Failure('invalid_file')
    original = Path(value)
    roots = os.environ.get('RAPAT_AUDIO_ROOTS', tempfile.gettempdir()).split(os.pathsep)
    resolved = original.resolve(strict=True)
    if original.is_symlink() or not any(resolved.is_relative_to(Path(r).resolve()) for r in roots if r):
        raise Failure('file_out_of_bounds')
    info = resolved.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size == 0 or info.st_size > MAX_FILE:
        raise Failure('invalid_file_size')
    return resolved


def transcribe(data):
    path = audio_file(data.get('file'))
    if data.get('language', 'id') != 'id':
        raise Failure('invalid_language')
    if not model_ready():
        raise Failure('whisper_model_missing')
    with path.open('rb') as source:
        return recognize(source)


def recognize(source):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise Failure('transcriber_dependency_missing') from None
    try:
        model = WhisperModel(str(model_path()), device='cpu', compute_type='int8',
                             local_files_only=True, cpu_threads=2, num_workers=1)
    except Exception:
        raise Failure('whisper_model_load_failed') from None
    # PyAV detects media content, regardless of a random temporary filename.
    try:
        segments, _ = model.transcribe(source, language='id', task='transcribe',
                                       beam_size=5, temperature=0, word_timestamps=True,
                                       hallucination_silence_threshold=2,
                                       vad_filter=True, condition_on_previous_text=False)
        decoded = list(segments)
    except Exception as exc:
        code = 'audio_decode_failed' if type(exc).__module__.startswith('av.') else 'transcription_failed'
        raise Failure(code) from None
    result = [dict(start=float(s.start), end=float(s.end), text=s.text.strip(), speaker=None)
              for s in decoded]
    text = ' '.join(s['text'] for s in result).strip()
    if not any(c.isalnum() for c in text):
        raise Failure('no_usable_speech')
    def finite(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    def mean(values):
        values = [v for v in values if finite(v)]
        return round(sum(values) / len(values), 4) if values else None
    low_confidence = [i for i, s in enumerate(decoded)
                      if (finite(getattr(s, 'avg_logprob', None)) and s.avg_logprob < -1)
                      or (finite(getattr(s, 'no_speech_prob', None)) and s.no_speech_prob > 0.6)]
    stats = dict(segmentCount=len(result),
                 avgLogprob=mean(getattr(s, 'avg_logprob', None) for s in decoded),
                 avgNoSpeechProbability=mean(getattr(s, 'no_speech_prob', None) for s in decoded),
                 avgWordProbability=mean(getattr(w, 'probability', None) for s in decoded
                                         for w in (getattr(s, 'words', None) or [])),
                 lowConfidenceSegmentIndexes=low_confidence)
    return dict(text=text, segments=result, stats=stats,
                warnings=['low_confidence_speech'] if low_confidence else [])


def decode_window(path, destination, start, seconds):
    """Stream decode, retaining only the requested window; works without WebM cues.

    Re-reading preceding compressed frames costs decode time, but never stores the
    full recording in RAM and avoids inaccurate seeks on live/browser containers.
    """
    import av
    skip = start * 16000
    limit = seconds * 16000
    written = cursor = 0
    more = False
    with av.open(str(path)) as container, wave.open(str(destination), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(16000)
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
        def frames():
            for frame in container.decode(audio=0):
                yield from resampler.resample(frame)
            yield from resampler.resample(None)
        for frame in frames():
            values = frame.to_ndarray().reshape(-1)
            begin = max(0, skip - cursor)
            cursor += len(values)
            if begin >= len(values):
                continue
            values = values[begin:]
            take = min(len(values), limit-written)
            if take:
                out.writeframesraw(values[:take].astype('<i2', copy=False).tobytes())
                written += take
            if len(values) > take:
                more = True
                break
    return written/16000, more


def transcribe_part(data):
    path = audio_file(data.get('file'))
    start = data.get('startSeconds', 0)
    seconds = data.get('chunkSeconds', 900)
    if type(start) is not int or start < 0 or type(seconds) is not int or not 1 <= seconds <= 900:
        raise Failure('invalid_audio_window')
    if data.get('language', 'id') != 'id' or os.environ.get('RAPAT_WHISPER_MODEL', 'small') != 'small':
        raise Failure('invalid_language_or_model')
    if not model_ready():
        raise Failure('whisper_model_missing')
    fd, name = tempfile.mkstemp(prefix=path.name+'_window_', suffix='.wav', dir=path.parent)
    os.close(fd)
    try:
        try:
            duration, more = decode_window(path, name, start, seconds)
        except Exception:
            raise Failure('audio_decode_failed') from None
        if duration == 0:
            result = dict(text='', segments=[])
        else:
            try:
                with open(name, 'rb') as source:
                    result = recognize(source)
            except Failure as error:
                if str(error) != 'no_usable_speech':
                    raise
                result = dict(text='', segments=[])
        return dict(text=result['text'], segments=result['segments'], startSeconds=start,
                    durationSeconds=duration, hasMore=more)
    finally:
        Path(name).unlink(missing_ok=True)


def dispatch(command, data):
    if command == 'health':
        return health()
    if command == 'transcribe':
        return transcribe(data)
    if command == 'transcribe_part':
        return transcribe_part(data)
    raise Failure('invalid_command')


def main():
    # Hard process deadline also covers native inference and slow HTTP bodies.
    output_fd = os.dup(1)
    try:
        timeout = min(3600, max(5, int(os.environ.get('RAPAT_TIMEOUT_SECONDS', '900'))))
    except ValueError:
        timeout = 900
    def expired():
        os.write(output_fd, b'{"error":{"code":"timeout","message":"Batas waktu runtime lokal terlampaui."}}\n')
        os._exit(1)
    timer = threading.Timer(timeout, expired)
    timer.daemon = True
    timer.start()
    try:
        raw = sys.stdin.buffer.read(MAX_INPUT + 1)
        if len(raw) > MAX_INPUT:
            raise Failure('input_too_large')
        data = json.loads(raw or b'{}')
        if not isinstance(data, dict):
            raise Failure('invalid_input')
        command = sys.argv[1] if len(sys.argv) > 1 else data.get('command')
        # Suppress dependency output at OS level, including native decoder logs.
        saved = os.dup(1)
        try:
            with open(os.devnull, 'w') as sink:
                os.dup2(sink.fileno(), 1)
                os.dup2(sink.fileno(), 2)
                result = dispatch(command, data)
        finally:
            os.dup2(saved, 1)
            os.close(saved)
        code = 0
    except Exception as exc:
        key = str(exc) if isinstance(exc, Failure) else 'runtime_failed'
        result = dict(error=dict(code=key, message='Runtime AI lokal gagal; periksa konfigurasi dan kesiapan model.'))
        code = 1
    timer.cancel()
    os.close(output_fd)
    print(json.dumps(result, ensure_ascii=True), flush=True)
    return code


if __name__ == '__main__':
    sys.exit(main())
