<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\Process\Process;

it('serves every application endpoint below the versioned Laravel API', function () {
    $routes = collect(Route::getRoutes())->map->uri();

    expect($routes)->not->toBeEmpty();
    foreach ($routes as $route) {
        expect($route)->toStartWith('api/v1/');
    }
    expect($routes)->not->toContain('sanctum/csrf-cookie');
});

it('returns stable JSON errors without exposing internal exceptions', function () {
    Route::get('/api/v1/test-internal-error', fn () => throw new RuntimeException('private database path'))->middleware('api');
    Route::get('/api/v1/test-service-unavailable', fn () => abort(503, 'Layanan pembayaran belum siap.'))->middleware('api');

    $this->getJson('/api/v1/missing')
        ->assertNotFound()
        ->assertJsonPath('error.code', 'not_found');

    $response = $this->getJson('/api/v1/test-internal-error')
        ->assertStatus(500)
        ->assertExactJson(['error' => [
            'code' => 'server_error',
            'message' => 'An unexpected error occurred.',
            'details' => [],
        ]]);

    expect($response->getContent())->not->toContain('database', 'private');

    $this->getJson('/api/v1/test-service-unavailable')
        ->assertStatus(503)
        ->assertJsonPath('error.message', 'Layanan pembayaran belum siap.');
});

it('resolves the encrypted backup service from its console command', function () {
    $directory = storage_path('framework/testing/backup-cli-'.bin2hex(random_bytes(6)));
    config(['backup.directory' => $directory]);

    try {
        $this->artisan('erp:backup', ['operation' => 'list'])
            ->expectsOutput('[]')
            ->assertSuccessful();
    } finally {
        if (is_dir($directory)) {
            rmdir($directory); // This test only creates an empty, uniquely named directory.
        }
    }
});

it('passes the full migrated API flow against an isolated in-memory database', function () {
    $process = new Process([PHP_BINARY, base_path('tools/verify-migration.php')], base_path(), timeout: 120);
    $process->run();

    expect($process->getExitCode())->toBe(0, $process->getErrorOutput().$process->getOutput());
    expect($process->getOutput())
        ->toContain('Migration smoke checks completed; no external database was used.')
        ->not->toContain('FAIL');
    expect(substr_count($process->getOutput(), 'PASS '))->toBeGreaterThanOrEqual(70);
});
