<?php

// One-time local cleanup; never exposed as a public route.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$connection = config('database.default');
$host = config("database.connections.$connection.host");
if (! app()->environment('local') || ! in_array($host, ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Cleanup is restricted to the local development database.');
}
$counts = [];
foreach (['bantuan_applications', 'bantuan_documents', 'bantuan_events', 'bantuan_notifications'] as $table) {
    $counts[$table] = Illuminate\Support\Facades\DB::table($table)->count();
}
echo json_encode(['database' => config("database.connections.$connection.database"), 'before' => $counts]).PHP_EOL;
if (! in_array('--execute', $argv, true)) exit(0);
$deletion = app(App\Modules\Bantuan\Services\ApplicationDeletion::class);
$paths = Illuminate\Support\Facades\DB::transaction(function () use ($deletion) {
    $ids = App\Modules\Bantuan\Models\Application::query()->orderBy('id')->lockForUpdate()->pluck('id')->all();
    return $deletion->records($ids);
});
$deletion->files($paths);
echo json_encode(['remainingApplications' => App\Modules\Bantuan\Models\Application::count(), 'documentFilesRemoved' => count($paths)]).PHP_EOL;
