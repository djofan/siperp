<?php

use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Symfony\Component\Process\Process;

it('keeps exported OpenAPI artifacts current and matches every live route and method', function () {
    $process = new Process(['node', 'api/tools/export-openapi.mjs', '--check'], dirname(base_path()));
    $process->mustRun();
    $spec = json_decode(file_get_contents(base_path('docs/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
    expect($spec['openapi'])->toBe('3.1.0');
    expect($spec['components']['securitySchemes']['bearerAuth']['scheme'])->toBe('bearer');
    $actual = [];
    foreach (Route::getRoutes() as $route) {
        foreach ($route->methods() as $method) {
            if ($method !== 'HEAD') {
                $actual[] = strtolower($method).' /'.$route->uri();
            }
        }
    }
    $documented = [];
    foreach ($spec['paths'] as $path => $operations) {
        foreach ($operations as $method => $operation) {
            $documented[] = $method.' '.$path;
        }
    }
    sort($actual);
    sort($documented);
    expect($actual)->toBe($documented);
    expect(implode(' ', array_keys($spec['paths'])))->not->toContain('/examples/');
    require base_path('tests/Fixtures/Rest/register.php');
    $example = json_decode(file_get_contents(base_path('docs/openapi.example.json')), true, flags: JSON_THROW_ON_ERROR);
    expect($example['x-example-only'])->toBeTrue();
    foreach (Route::getRoutes() as $route) {
        if (! str_starts_with($route->uri(), 'api/v1/examples/')) {
            continue;
        }
        foreach ($route->methods() as $method) {
            if ($method !== 'HEAD') {
                expect(isset($example['paths']['/'.$route->uri()][strtolower($method)]))->toBeTrue();
            }
        }
    }
});

it('validates live health and login responses against the authoritative OpenAPI contract', function () {
    assertOpenApiResponse($this->getJson('/api/v1/health')->assertOk(), 'GET', '/api/v1/health');
    assertOpenApiResponse($this->postJson('/api/v1/auth/login', [])->assertUnprocessable(), 'POST', '/api/v1/auth/login');
    $email = 'contract-'.bin2hex(random_bytes(8)).'@example.test';
    $key = hash('sha256', $email.'|127.0.0.1');
    RateLimiter::clear($key);
    try {
        for ($i = 0; $i < 5; $i++) {
            assertOpenApiResponse($this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'test'])->assertStatus(501), 'POST', '/api/v1/auth/login');
        }
        assertOpenApiResponse($this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'test'])->assertStatus(429), 'POST', '/api/v1/auth/login');
    } finally {
        RateLimiter::clear($key);
    }
});
