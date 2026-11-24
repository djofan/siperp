<?php

use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\LocalEngineFailure;
use App\Modules\Rapat\Services\RapatData;
use App\Modules\Rapat\Services\TemporaryAudio;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

// CLI only. Inspect the latest failed recording without changing meeting/media rows.
// Optional --transcribe tests inference but never prints audio or transcript content.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$stage = 'bootstrap';
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $infer = in_array('--transcribe', $argv, true);
    $stage = 'query';
    if ($infer && Meeting::where('status', 'processing')->exists()) {
        throw new RuntimeException('busy');
    }
    $m = Meeting::where('status', 'failed')->latest('updated_at')->first();
    $f = $m ? Media::where('meeting_id', $m->id)->orderBy('transcribed')->orderBy('sequence')->first() : null;
    if (! $f) {
        echo "RAPAT_NO_FAILED_AUDIO\n";
        exit(0);
    }
    $checks = [];
    $stage = 'read_audio';
    $encrypted = Storage::disk('local')->get($f->path);
    if (! is_string($encrypted) || $encrypted === '') {
        throw new RuntimeException;
    }
    $checks[] = $stage;
    $stage = 'decrypt_audio';
    $bytes = Crypt::decryptString($encrypted);
    $checks[] = $stage;
    $stage = 'temporary_audio';
    (new TemporaryAudio)->withFile($bytes, function ($file) use (&$stage, &$checks, $infer, $app) {
        $checks[] = $stage;
        if ($infer) {
            $stage = 'transcribe';
            $result = $app->make(LocalEngine::class)->run(['operation' => 'transcribe', 'file' => $file, 'language' => 'id']);
            RapatData::transcribed($result);
            $checks[] = $stage;
        }
    });
    echo json_encode(['status' => 'RAPAT_AUDIO_CHECK_OK', 'checks' => $checks], JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    $reason = $error instanceof LocalEngineFailure ? $error->reason : 'operation_failed';
    echo json_encode(['status' => 'RAPAT_AUDIO_CHECK_FAILED', 'stage' => $stage, 'exception' => get_class($error), 'reason' => $reason]).PHP_EOL;
    exit(1);
}
