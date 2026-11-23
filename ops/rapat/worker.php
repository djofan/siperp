<?php

use App\Modules\Rapat\Services\LocalEngine;
use Illuminate\Contracts\Console\Kernel;

if (! extension_loaded('pcntl')) {
    fwrite(STDERR, "RAPAT_WORKER_PCNTL_MISSING\n");
    exit(78);
}
$r = realpath('/var/www/siperp-deploy/current');
if (! $r || ! preg_match('~^/var/www/siperp-deploy/releases/[0-9]{14}-[a-f0-9]{12}$~D', $r)) {
    fwrite(STDERR, "RAPAT_WORKER_RELEASE_INVALID\n");
    exit(78);
}
try {
    chdir($r.'/api');
    require $r.'/api/vendor/autoload.php';
    $app = require $r.'/api/bootstrap/app.php';
    $kernel = $app->make(Kernel::class);
    $kernel->bootstrap();
    if (config('queue.connections.rapat.driver') !== 'database'
        || config('queue.connections.rapat.table') !== 'rapat_jobs'
        || (int) config('queue.connections.rapat.retry_after') <= 3600) {
        throw new RuntimeException;
    }
    $h = $app->make(LocalEngine::class)->run(['operation' => 'health']);
    if (($h['transcriberReady'] ?? false) !== true && ($h['summarizerReady'] ?? false) !== true) {
        echo 'RAPAT_WORKER_WAITING_FOR_AI '.json_encode([
            'transcriberReady' => ($h['transcriberReady'] ?? false) === true,
            'summarizerReady' => ($h['summarizerReady'] ?? false) === true,
        ]).PHP_EOL;
        sleep(30);
        exit(0);
    }
} catch (Throwable) {
    fwrite(STDERR, "RAPAT_WORKER_WAITING_FOR_CONFIGURATION\n");
    sleep(30);
    exit(0);
}
// Daemon mode preserves Laravel's signal and timeout handling; exit after one job.
exit($kernel->call('queue:work', [
    'connection' => 'rapat', '--queue' => 'rapat-transcription,rapat', '--max-jobs' => 1,
    '--stop-when-empty' => true, '--max-time' => 60, '--sleep' => 3,
    '--tries' => 1, '--timeout' => 3600, '--memory' => 256,
]));
