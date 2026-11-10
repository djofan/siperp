<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

function diagnosticQuery(string $state, int $driver, string $driverMessage = 'private credential and database text'): QueryException
{
    $previous = new PDOException($driverMessage);
    $previous->errorInfo = [$state, $driver, $driverMessage];
    return new QueryException('mysql', 'insert into private_users values (?)', ['private-password-123'], $previous);
}

it('classifies server database failures without exposing their SQL or bindings', function (string $state, int $driver, int $status, string $diagnostic) {
    Log::spy();
    Route::post('/api/v1/test-database-diagnostic', fn () => throw diagnosticQuery($state, $driver))->middleware('api');
    $response = $this->postJson('/api/v1/test-database-diagnostic', ['password' => 'request-secret'])->assertStatus($status)
        ->assertJsonPath('error.diagnosticCode', $diagnostic)->assertJsonStructure(['error' => ['code', 'message', 'details', 'requestId']]);
    $id = $response->json('error.requestId');
    expect($id)->toMatch('/^[a-f0-9-]{36}$/')
        ->and($response->headers->get('X-Request-ID'))->toBe($id)
        ->and($response->headers->get('Cache-Control'))->toContain('no-store')
        ->and($response->getContent())->toContain($id, $diagnostic)->not->toContain('private_users', 'private-password', 'request-secret', 'SQLSTATE', 'credential');
    Log::shouldHaveReceived('error')->once()->withArgs(function ($message, $context) use ($id, $diagnostic) {
        return $message === 'api_request_failed' && $context['request_id'] === $id && $context['diagnostic_code'] === $diagnostic
            && ! str_contains(json_encode($context), 'request-secret') && ! str_contains(json_encode($context), 'private-password')
            && ! array_key_exists('sql', $context) && ! array_key_exists('bindings', $context);
    });
})->with([
    ['42S22', 1054, 500, 'DB_SCHEMA_MISMATCH'],
    ['42S02', 1146, 500, 'DB_SCHEMA_MISMATCH'],
    ['HY000', 2002, 503, 'DB_UNAVAILABLE'],
    ['28000', 1045, 503, 'DB_UNAVAILABLE'],
    ['23000', 1062, 409, 'DATA_ALREADY_EXISTS'],
    ['23000', 1452, 409, 'DATA_CONSTRAINT'],
    ['40001', 1213, 409, 'DB_BUSY'],
    ['HY000', 9999, 500, 'DB_QUERY_FAILED'],
]);

it('returns a stable support reference for unexpected errors even with debug enabled', function () {
    config(['app.debug' => true]);
    Route::get('/api/v1/test-private-diagnostic', fn () => throw new RuntimeException('SECRET_PRIVATE_EXCEPTION_TEXT'))->middleware('api');
    $first = $this->getJson('/api/v1/test-private-diagnostic')->assertStatus(500)->assertJsonPath('error.diagnosticCode', 'SERVER_INTERNAL_ERROR');
    $second = $this->getJson('/api/v1/test-private-diagnostic')->assertStatus(500);
    expect($first->getContent())->not->toContain('SECRET_PRIVATE_EXCEPTION_TEXT', 'stacktrace', 'RuntimeException')
        ->and($first->json('error.requestId'))->not->toBe($second->json('error.requestId'));
});

it('preserves validation fields and a deliberate business error while adding diagnostic metadata', function () {
    Route::post('/api/v1/test-diagnostic-validation', fn () => throw ValidationException::withMessages(['password' => 'Password minimal 12 karakter.']))->middleware('api');
    $this->postJson('/api/v1/test-diagnostic-validation')->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed')->assertJsonPath('error.diagnosticCode', 'VALIDATION_FAILED')
        ->assertJsonValidationErrors('password', 'error.details');
    Route::get('/api/v1/test-diagnostic-business', fn () => abort(403, 'Hanya Call Center yang dapat mengubah data.'))->middleware('api');
    $this->getJson('/api/v1/test-diagnostic-business')->assertForbidden()->assertJsonPath('error.message', 'Hanya Call Center yang dapat mengubah data.');
});

it('preserves retry headers and tells the user the actual retry duration', function () {
    Route::get('/api/v1/test-diagnostic-limit', fn () => throw new HttpException(429, '', null, ['Retry-After' => '37']))->middleware('api');
    $response = $this->getJson('/api/v1/test-diagnostic-limit')->assertStatus(429)
        ->assertHeader('Retry-After', '37')->assertJsonPath('error.retryAfter', 37)->assertJsonPath('error.diagnosticCode', 'TOO_MANY_REQUESTS');
    expect($response->json('error.message'))->toContain('37 detik');
});

it('does not return internal model or path names for missing resources', function () {
    Route::get('/api/v1/test-diagnostic-missing', fn () => abort(404, 'Private model /private/path'))->middleware('api');
    $response = $this->getJson('/api/v1/test-diagnostic-missing')->assertNotFound()->assertJsonPath('error.diagnosticCode', 'RESOURCE_NOT_FOUND');
    expect($response->getContent())->not->toContain('Private model', '/private/path');
});

it('distinguishes encryption configuration and unreadable stored data', function (string $type, string $diagnostic, int $status) {
    Route::get('/api/v1/test-diagnostic-encryption', fn () => throw new $type('private ciphertext'))->middleware('api');
    $response = $this->getJson('/api/v1/test-diagnostic-encryption')->assertStatus($status)->assertJsonPath('error.diagnosticCode', $diagnostic);
    expect($response->getContent())->not->toContain('private ciphertext');
})->with([
    [Illuminate\Encryption\MissingAppKeyException::class, 'APP_KEY_MISSING', 503],
    [Illuminate\Contracts\Encryption\DecryptException::class, 'ENCRYPTION_DATA_UNREADABLE', 500],
]);
