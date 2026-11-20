<?php

namespace App\Modules\Rapat\Services;

use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Symfony\Component\Process\Process;

class LocalEngine
{
    public function transcriptionRevision(): string
    {
        return hash('sha256', json_encode([
            'model' => config('rapat.model_dirs.RAPAT_WHISPER_MODEL', 'large-v3'),
            'pipelineVersion' => config('rapat.transcription_pipeline_version', '2'),
            'language' => 'id',
        ], JSON_THROW_ON_ERROR));
    }

    public function run(array $input): array
    {
        try {
            $env = array_filter(config('rapat.model_dirs', []), fn ($v) => is_string($v) && $v !== '');
            $env['RAPAT_TIMEOUT_SECONDS'] = (string) ($input['operation'] === 'health' ? config('rapat.health_timeout') : config('rapat.timeout'));
            $env['RAPAT_AUDIO_ROOTS'] = storage_path('app/private/rapat/tmp');
            $env += ['HF_HUB_OFFLINE' => '1', 'TRANSFORMERS_OFFLINE' => '1', 'HF_HUB_DISABLE_TELEMETRY' => '1'];
            $p = new Process([config('rapat.python'), config('rapat.engine'), $input['operation']], dirname(base_path()), $env, json_encode($input, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $input['operation'] === 'health' ? config('rapat.health_timeout') : config('rapat.timeout'));
            $p->run();
            if (strlen($p->getOutput()) > 4000000) {
                throw new RuntimeException;
            }
            $data = json_decode($p->getOutput(), true, 64, JSON_THROW_ON_ERROR);
            if ($input['operation'] === 'transcribe' && is_array($data) && in_array($data['error']['code'] ?? null, ['no_speech', 'no_speech_detected', 'no_usable_speech'], true)) {
                throw new NoSpeechDetected;
            }
            if (! $p->isSuccessful() || ! is_array($data) || isset($data['error'])) {
                throw new RuntimeException;
            }

            return $data;
        } catch (NoSpeechDetected $error) {
            throw $error;
        } catch (\Throwable) {
            throw new RuntimeException('Mesin AI lokal tidak tersedia.');
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

            return ['provider' => 'local', 'configured' => ($h['provider'] ?? null) === 'local' && ($h['transcriberReady'] ?? false) === true && ($h['summarizerReady'] ?? false) === true];
        } catch (\Throwable) {
            return ['provider' => 'local', 'configured' => false];
        }
    }
}
