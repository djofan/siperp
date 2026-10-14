<?php

use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\Fixtures\Rest\ExampleStore;

it('demonstrates a stateless REST resource with pagination, CRUD, privacy and idempotency', function () {
    require base_path('tests/Fixtures/Rest/register.php');
    withNextAuthFixture(function (array $fixture, User $user): void {
        $token = app(TokenIssuer::class)->issue($user)->plainTextToken;
        $base = '/api/v1/examples/payment-attempts';
        $call = function (string $method, string $uri, array $body = [], array $headers = []) use ($token) {
            Auth::forgetGuards();

            $response = $this->json($method, $uri, $body, array_merge(['Authorization' => 'Bearer '.$token], $headers));
            assertOpenApiResponse($response, $method, $uri, true);

            return $response;
        };
        Auth::forgetGuards();
        $this->getJson($base)->assertUnauthorized()->assertJsonPath('error.code', 'unauthenticated');
        $store = app(ExampleStore::class);
        $call('POST', $base, ['name' => 'Alpha', 'amount' => 100])->assertUnprocessable()->assertJsonPath('error.code', 'validation_failed');
        $headers = ['Idempotency-Key' => 'example-payment-1'];
        $created = $call('POST', $base, ['name' => 'Alpha', 'amount' => 100], $headers)->assertCreated();
        $id = $created->json('data.id');
        $created->assertHeader('Location', config('app.url').$base.'/'.$id);
        expect(array_keys($created->json('data')))->toBe(['id', 'name', 'amount', 'status']);
        expect($id)->toMatch('/^c[a-z0-9]{24}$/D');
        $replay = $call('POST', $base, ['amount' => 100, 'name' => 'Alpha'], $headers)->assertCreated();
        expect($replay->json())->toBe($created->json());
        $replay->assertHeader('Location', $created->headers->get('Location'));
        expect($store->records)->toHaveCount(1);
        $call('POST', $base, ['name' => 'Alpha', 'amount' => 200], $headers)->assertStatus(409)->assertJsonPath('error.code', 'conflict');
        expect($store->records)->toHaveCount(1);
        $call('POST', $base, ['name' => 'Beta', 'amount' => 200], ['Idempotency-Key' => 'example-payment-2'])->assertCreated();
        $call('POST', $base, ['name' => 'Other', 'amount' => 50], ['Idempotency-Key' => 'example-payment-3'])->assertCreated();
        $beforeRead = $store->records;
        $call('GET', $base.'/'.$id)->assertOk()->assertExactJson($created->json());
        $list = $call('GET', $base.'?filter[status]=pending&sort=-amount&q=a&per_page=1&page=2')->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.per_page', 1)->assertJsonPath('data.0.id', $id)->assertJsonStructure(['data', 'meta', 'links' => ['first', 'last', 'prev', 'next']]);
        expect($list->json('links.prev'))->toContain('per_page=1', 'sort=-amount', 'q=a');
        expect(array_keys($list->json('data.0')))->toBe(['id', 'name', 'amount', 'status']);
        expect($store->records)->toBe($beforeRead);
        $call('GET', $base.'?per_page=101')->assertUnprocessable();
        $call('GET', $base.'?filter[owner_id]=secret')->assertUnprocessable();
        $call('GET', $base.'?sort=private_notes')->assertUnprocessable();
        $call('PUT', $base.'/'.$id, ['name' => 'Replacement'])->assertUnprocessable();
        $call('PUT', $base.'/'.$id, ['name' => 'Replacement', 'amount' => 300, 'status' => 'cancelled'])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $call('PATCH', $base.'/'.$id, ['name' => 'Partial'])->assertOk()->assertJsonPath('data.amount', 300)->assertJsonPath('data.status', 'cancelled');
        $call('PATCH', $base.'/'.$id, [])->assertUnprocessable();
        // Cookies alone do not establish identity; every request needs Bearer.
        Auth::forgetGuards();
        $this->withCookie('siperp_api_session', 'ignored')->getJson($base)->assertUnauthorized();
        $foreign = $store->create('another-user', 'example-payment-1', ['name' => 'Private', 'amount' => 100]);
        $call('GET', $base.'/'.$foreign['id'])->assertForbidden()->assertJsonPath('error.code', 'forbidden');
        $call('GET', $base.'/missing')->assertNotFound()->assertJsonPath('error.code', 'not_found');
        $call('DELETE', $base.'/'.$id)->assertNoContent();
        $call('GET', $base.'/'.$id)->assertNotFound();
        $call('POST', $base, ['name' => 'Alpha', 'amount' => 100], $headers)->assertCreated()->assertJsonPath('data.id', $id);
        expect($store->records)->toHaveCount(3); // Replay cannot resurrect a deleted payment.
        foreach (Route::getRoutes() as $route) {
            expect($route->gatherMiddleware())->not->toContain(StartSession::class);
        }
    });
});

it('uses resource error envelopes for malformed JSON and redacts every 5xx', function () {
    $this->call('POST', '/api/v1/auth/login', server: ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], content: '{invalid')->assertStatus(400)->assertJsonPath('error.code', 'bad_request');
    Route::get('/api/v1/test-internal-error', fn () => throw new RuntimeException('database password or internal path'))->middleware('api');
    $response = $this->getJson('/api/v1/test-internal-error')->assertStatus(500)->assertExactJson(['error' => ['code' => 'server_error', 'message' => 'An unexpected error occurred.', 'details' => []]]);
    expect($response->getContent())->not->toContain('password', 'internal path');
    $this->postJson('/api/v1/auth/login', ['email' => 'rest-placeholder@example.test', 'password' => 'test'])->assertStatus(501)->assertJsonPath('error.message', 'An unexpected error occurred.');
});
