<?php

namespace App\Modules\Rapat\Services;

use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

class LocalEngine
{
    public function transcriptionRevision(): string
    {
        return hash('sha256', json_encode([
            'model' => config('rapat.model_dirs.RAPAT_WHISPER_MODEL', 'small'),
            'pipelineVersion' => config('rapat.transcription_pipeline_version', '2'),
            'language' => 'id',
        ], JSON_THROW_ON_ERROR));
    }

    public function run(array $input): array
    {
        if (($input['operation'] ?? null) === 'minutes') {
            throw new LocalEngineFailure('process_failed');
        }
        try {
            $env = array_filter(config('rapat.model_dirs', []), fn ($v) => is_string($v) && $v !== '');
            $env['RAPAT_TIMEOUT_SECONDS'] = (string) ($input['operation'] === 'health' ? config('rapat.health_timeout') : config('rapat.timeout'));
            $env['RAPAT_AUDIO_ROOTS'] = TemporaryAudio::root();
            $env += ['HF_HUB_OFFLINE' => '1', 'TRANSFORMERS_OFFLINE' => '1', 'HF_HUB_DISABLE_TELEMETRY' => '1'];
            $p = new Process([config('rapat.python'), config('rapat.engine'), $input['operation']], dirname(base_path()), $env, json_encode($input, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $input['operation'] === 'health' ? config('rapat.health_timeout') : config('rapat.timeout'));
            $p->run();
            if (strlen($p->getOutput()) > 4000000) {
                throw new RuntimeException;
            }
            $data = json_decode($p->getOutput(), true, 64, JSON_THROW_ON_ERROR);
            if (in_array($input['operation'], ['transcribe', 'transcribe_part'], true) && is_array($data) && in_array($data['error']['code'] ?? null, ['no_speech', 'no_speech_detected', 'no_usable_speech'], true)) {
                throw new NoSpeechDetected;
            }
            if (! $p->isSuccessful() || ! is_array($data) || isset($data['error'])) {
                $known = ['whisper_model_missing', 'transcriber_dependency_missing', 'whisper_model_load_failed', 'audio_decode_failed', 'transcription_failed', 'timeout'];
                $reason = $data['error']['code'] ?? null;
                throw new LocalEngineFailure(in_array($reason, $known, true) ? $reason : 'runtime_failed');
            }

            return $data;
        } catch (NoSpeechDetected $error) {
            throw $error;
        } catch (LocalEngineFailure $error) {
            throw $error;
        } catch (ProcessTimedOutException) {
            throw new LocalEngineFailure('timeout');
        } catch (\Throwable) {
            throw new LocalEngineFailure('process_failed');
        }
    }

    public function health(): array
    {
        return Cache::remember('rapat.local.health', 30, fn () => $this->probe());
    }

    private function probe(): array
    {
        try {
            $h = $this->run(['operation' => 'health']);

            $local = ($h['provider'] ?? null) === 'local';
            $transcriber = $local && ($h['transcriberReady'] ?? false) === true;
            $summarizer = false;

            return ['provider' => 'local', 'transcriberReady' => $transcriber, 'summarizerReady' => $summarizer, 'configured' => $transcriber];
        } catch (\Throwable) {
            return ['provider' => 'local', 'configured' => false, 'transcriberReady' => false, 'summarizerReady' => false];
        }
    }
}
