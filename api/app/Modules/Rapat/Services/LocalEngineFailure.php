<?php

namespace App\Modules\Rapat\Services;

use RuntimeException;

class LocalEngineFailure extends RuntimeException
{
    public readonly string $reason;

    public function __construct(string $reason)
    {
        $known = ['whisper_model_missing', 'transcriber_dependency_missing', 'whisper_model_load_failed', 'audio_decode_failed', 'transcription_failed', 'timeout', 'runtime_failed', 'process_failed'];
        $this->reason = in_array($reason, $known, true) ? $reason : 'runtime_failed';
        parent::__construct('Mesin AI lokal tidak tersedia.');
    }
}
