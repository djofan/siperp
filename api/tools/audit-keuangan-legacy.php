<?php

// Source-only audit. Destination exists solely in memory; no user database is opened.
use App\Modules\Keuangan\Services\LegacyFinanceImport;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite' => [
    'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true,
]]);
DB::purge('sqlite');
$app->instance('env', 'local');
try {
    if ($argc !== 3 || ! is_file($argv[1]) || file_exists($argv[2])) {
        throw new RuntimeException('Gunakan snapshot privat dan nama laporan baru.');
    }
    $snapshot = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
    Schema::create('users', fn (Blueprint $t) => $t->string('id', 191)->primary());
    Schema::create('modules', function (Blueprint $t): void {
        $t->string('id', 191)->primary();
        $t->string('slug');
        $t->string('name');
        $t->text('description');
        $t->boolean('is_active');
    });
    foreach (['2026_11_16_000001_create_keuangan_foundation', '2026_11_17_000004_add_keuangan_workflow', '2026_11_18_000001_add_keuangan_legacy_import'] as $migration) {
        (require __DIR__.'/../database/migrations/'.$migration.'.php')->up();
    }
    $report = app(LegacyFinanceImport::class)->run($snapshot, []);
    $file = fopen($argv[2], 'x');
    if (! $file) {
        throw new RuntimeException('Laporan tidak dapat dibuat.');
    }
    fwrite($file, json_encode(['scope' => 'source-only; empty in-memory target; account mapping pending', ...$report], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
    fclose($file);
    echo 'Audit sumber selesai di SQLite memory; laporan privat dibuat; tidak ada impor atau perubahan database pengguna.'.PHP_EOL;
} catch (Throwable $error) {
    // Avoid exception traces/SQL bindings which may contain source financial details.
    $reason = get_class($error) === RuntimeException::class ? $error->getMessage() : 'Periksa format sumber dan relasi.';
    fwrite(STDERR, 'Audit gagal: '.$reason.' Database pengguna tidak diakses.'.PHP_EOL);
    exit(1);
}
