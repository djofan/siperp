<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$db = DB::connection();
if ($db->getDatabaseName() !== 'sipmodular_laravel_dev') {
    throw new LogicException('Clone only');
}
foreach (['users', 'modules', 'module_access', 'access_logs'] as $table) {
    echo json_encode(['table' => $table, 'columns' => $db->select('DESCRIBE '.$table)], JSON_THROW_ON_ERROR).PHP_EOL;
}
echo json_encode([
    'timezone' => $db->selectOne('SELECT @@session.time_zone AS zone')->zone,
    'database' => $db->getDatabaseName(),
    'migrations' => $db->table('migrations')->pluck('migration')->all(),
    'fixture_users_remaining' => $db->table('users')->where('email', 'like', 'laravel-foundation-%@example.test')->count(),
    'fixture_logs_remaining' => $db->table('access_logs')->where('message', 'like', '%Laravel foundation test%')->count(),
    'tokens_remaining' => $db->table('personal_access_tokens')->count(),
], JSON_THROW_ON_ERROR).PHP_EOL;
