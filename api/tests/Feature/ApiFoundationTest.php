<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

it('reports the application and real database connection health in UTC', function () {
    $this->getJson('/api/v1/health')->assertOk()->assertExactJson(['data' => ['status' => 'ok', 'database' => ['status' => 'connected']]]);
    expect(config('app.timezone'))->toBe('UTC');
    expect(DB::selectOne('SELECT @@session.time_zone AS zone')->zone)->toBe('+00:00');
    expect(DB::selectOne('SELECT DATABASE() AS name')->name)->toBe('sipmodular_laravel_dev');
});

it('reports database failure without exposing exception details', function () {
    DB::shouldReceive('select')->once()->with('SELECT 1')->andThrow(new RuntimeException('secret database details'));
    $this->getJson('/api/v1/health')->assertStatus(503)->assertExactJson(['data' => ['status' => 'degraded', 'database' => ['status' => 'unavailable']]]);
});

it('validates the login placeholder and limits by normalized email plus IP', function () {
    $email = 'limiter-'.bin2hex(random_bytes(8)).'@example.test';
    $key = hash('sha256', strtolower($email).'|127.0.0.1');
    RateLimiter::clear($key);
    try {
        $this->postJson('/api/v1/auth/login', ['email' => ['invalid'], 'password' => 'test'])->assertUnprocessable()->assertJsonPath('error.code', 'validation_failed');
        $this->postJson('/api/v1/auth/login', [])->assertUnprocessable()->assertJsonPath('error.code', 'validation_failed')->assertJsonStructure(['error' => ['details' => ['email', 'password']]]);
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $i % 2 ? strtoupper($email) : $email, 'password' => 'test'])->assertStatus(501)->assertJsonPath('error.code', 'not_implemented');
        }
        $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'test'])->assertStatus(429)->assertJsonPath('error.code', 'rate_limited')->assertHeader('Retry-After');
        $this->postJson('/api/v1/auth/login', ['email' => 'other-'.$email, 'password' => 'test'])->assertStatus(501);
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.2'])->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'test'])->assertStatus(501);
    } finally {
        RateLimiter::clear($key);
    }
});

it('keeps all production endpoints under api/v1 and disables SPA sessions and CSRF routes', function () {
    expect(config('sanctum.guard'))->toBe([]);
    expect(config('sanctum.stateful'))->toBe([]);
    expect(config('sanctum.routes'))->toBeFalse();
    foreach (Route::getRoutes() as $route) {
        expect($route->uri())->toStartWith('api/v1/');
    }
    $this->getJson('/sanctum/csrf-cookie')->assertNotFound()->assertJsonPath('error.code', 'not_found');
});

it('fails closed for module access until the Core migration implements database authorization', function () {
    Route::get('/api/v1/test-module', fn () => ['ok' => true])->middleware('api', 'module.access:core');
    $this->getJson('/api/v1/test-module')->assertStatus(501)->assertJsonPath('error.code', 'not_implemented');
});
