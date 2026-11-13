<?php
// Read-only schema history inspection. Does not run migrate or pretend.
try {
    $release = $argv[1] ?? '';
    if (! preg_match('#^/var/www/siperp-deploy/releases/[0-9]{14}-[a-f0-9]{12}$#', $release)) {
        throw new RuntimeException('Invalid release');
    }
    require $release.'/api/vendor/autoload.php';
    $app = require $release.'/api/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $migrator = $app->make('migrator');
    if (! $migrator->repositoryExists()) {
        throw new RuntimeException('Migration repository missing');
    }
    $ran = $migrator->getRepository()->getRan();
    $plan = [];
    foreach ($migrator->getMigrationFiles([$release.'/api/database/migrations']) as $name => $file) {
        if (! in_array($name, $ran, true)) {
            $plan[] = ['name' => $name, 'sha256' => hash_file('sha256', $file)];
        }
    }
    echo json_encode($plan, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable) {
    fwrite(STDERR, "Migration inspection failed; no credentials displayed.\n");
    exit(1);
}
