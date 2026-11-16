<?php
// Print timeout numbers only, never configuration secrets.
try {
    if (! function_exists('pcntl_signal')) {
        throw new RuntimeException('Graceful worker signals require pcntl');
    }
    $release = $argv[1] ?? '';
    if (! preg_match('#^/var/www/siperp-deploy/releases/[0-9]{14}-[a-f0-9]{12}$#', $release)) {
        throw new RuntimeException('Invalid release');
    }
    require $release.'/api/vendor/autoload.php';
    $app = require $release.'/api/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $sync = (int) config('payment.ipaymu.sync_timeout');
    $retry = (int) config('queue.connections.payment.retry_after');
    $timeout = $sync + 40;
    if ($sync < 120 || $sync > 240 || $timeout >= $retry || config('queue.connections.payment.driver') !== 'database') {
        throw new RuntimeException('Queue settings need review');
    }
    echo $timeout.' '.($timeout + 90).PHP_EOL;
} catch (Throwable) {
    fwrite(STDERR, "Queue timeout inspection failed; no credentials displayed.\n");
    exit(1);
}
