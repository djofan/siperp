<?php

use App\Modules\Bantuan\Services\WebPushClient;
use App\Modules\Bantuan\Services\WebPushKeys;
use App\Modules\Bantuan\Services\WebPushSender;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Minishlink\WebPush\VAPID;

uses(RefreshDatabase::class);

function browserActor(bool $access = true): array
{
    $user = new User;
    $user->forceFill(['name' => 'Browser test', 'email' => Str::uuid().'@example.test', 'password_hash' => bcrypt('test-password'), 'is_active' => true])->save();
    if ($access) {
        DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id,
            'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => 'verifier']);
    }

    return [$user, app(TokenIssuer::class)->issue($user, 'next-server')];
}

function browserSubscription(string $device = 'browser'): array
{
    return ['endpoint' => 'https://fcm.googleapis.com/fcm/send/'.$device,
        'keys' => ['p256dh' => VAPID::createVapidKeys()['publicKey'], 'auth' => rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=')]];
}

function browserNote(string $userId): string
{
    $id = (string) Str::uuid();
    DB::table('bantuan_notifications')->insert(['id' => $id, 'user_id' => $userId, 'application_id' => (string) Str::uuid(),
        'message' => 'Identitas privat penerima', 'created_at' => now()]);

    return $id;
}

beforeEach(function () {
    $this->travelTo(now()->startOfSecond());
    $keys = VAPID::createVapidKeys();
    $this->mock(WebPushKeys::class)->shouldReceive('read')->andReturn($keys);
});

it('exposes only the public configuration and encrypts a session-bound subscription', function () {
    [$user, $token] = browserActor();
    $config = $this->withToken($token->plainTextToken)->getJson('/api/v1/bantuan/web-push/config')
        ->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('data.enabled', true);
    expect(array_keys($config->json('data')))->toBe(['enabled', 'publicKey']);
    $input = browserSubscription();
    $this->postJson('/api/v1/bantuan/web-push/subscriptions', $input)->assertNoContent();
    $row = DB::table('bantuan_web_subscriptions')->first();
    expect($row->user_id)->toBe($user->id)->and((string) $row->access_token_id)->toBe((string) $token->accessToken->id)
        ->and(decrypt($row->subscription))->toBe($input)->and($row->subscription)->not->toContain($input['endpoint']);
    $this->travel(1)->minutes();
    $this->postJson('/api/v1/bantuan/web-push/subscriptions', $input)->assertNoContent();
    expect(DB::table('bantuan_web_subscriptions')->first()->created_at)->toBe($row->created_at);
    $this->deleteJson('/api/v1/bantuan/web-push/subscriptions', ['endpoint' => $input['endpoint']])->assertNoContent();
    $this->assertDatabaseCount('bantuan_web_subscriptions', 0);
});

it('requires an active authenticated Bantuan session for browser subscriptions', function () {
    $this->getJson('/api/v1/bantuan/web-push/config')->assertUnauthorized();
    $this->postJson('/api/v1/bantuan/web-push/subscriptions', [])->assertUnauthorized();
    [$user, $token] = browserActor(false);
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', browserSubscription())->assertForbidden();
    DB::table('users')->where('id', $user->id)->update(['is_active' => false]);
    app('auth')->forgetGuards();
    $this->getJson('/api/v1/bantuan/web-push/config')->assertUnauthorized();
});

it('rejects arbitrary endpoints and malformed browser keys', function (string $endpoint) {
    [, $token] = browserActor();
    $input = browserSubscription();
    $input['endpoint'] = $endpoint;
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', $input)->assertUnprocessable();
    $this->assertDatabaseCount('bantuan_web_subscriptions', 0);
})->with(['http://fcm.googleapis.com/send/test', 'https://127.0.0.1/private', 'https://fcm.googleapis.com.evil.test/send',
    'https://user:pass@fcm.googleapis.com/send', 'https://fcm.googleapis.com:8443/send', 'https://example.test/send']);

it('validates keys and reports unavailable configuration without registering a browser', function () {
    [, $token] = browserActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', [])->assertUnprocessable();
    $input = browserSubscription();
    $input['keys']['auth'] = 'bad';
    $this->postJson('/api/v1/bantuan/web-push/subscriptions', $input)->assertUnprocessable();
    $this->mock(WebPushKeys::class)->shouldReceive('read')->andReturn(null);
    $this->getJson('/api/v1/bantuan/web-push/config')->assertOk()->assertJsonPath('data.enabled', false)->assertJsonPath('data.publicKey', null);
    $this->postJson('/api/v1/bantuan/web-push/subscriptions', browserSubscription())->assertServiceUnavailable();
});

it('reassigns a shared browser and prevents the previous account from removing the new registration', function () {
    [$a, $aToken] = browserActor();
    [$b, $bToken] = browserActor();
    $input = browserSubscription();
    $this->withToken($aToken->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', $input)->assertNoContent();
    $this->travel(1)->minutes();
    app('auth')->forgetGuards();
    $this->withToken($bToken->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', $input)->assertNoContent();
    app('auth')->forgetGuards();
    $this->withToken($aToken->plainTextToken)->deleteJson('/api/v1/bantuan/web-push/subscriptions', ['endpoint' => $input['endpoint']])->assertNoContent();
    $this->assertDatabaseCount('bantuan_web_subscriptions', 1);
    $this->assertDatabaseHas('bantuan_web_subscriptions', ['user_id' => $b->id, 'access_token_id' => $bToken->accessToken->id, 'created_at' => now()]);
});

it('sends only the recipients unread new notifications and deduplicates successful delivery', function () {
    [$b, $tokenB] = browserActor();
    [$c, $tokenC] = browserActor();
    $old = browserNote($b->id);
    $this->travel(1)->minutes();
    foreach ([[$tokenB, 'b'], [$tokenC, 'c']] as [$token, $device]) {
        app('auth')->forgetGuards();
        $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', browserSubscription($device))->assertNoContent();
    }
    $firstId = browserNote($b->id);
    $secondId = browserNote($b->id);
    $readId = browserNote($b->id);
    DB::table('bantuan_notifications')->where('id', $readId)->update(['read_at' => now()]);
    $client = $this->mock(WebPushClient::class);
    $client->shouldReceive('send')->once()->withArgs(fn ($subscription, $payload) => str_ends_with($subscription['endpoint'], '/b')
        && $payload['tag'] === $firstId && ! str_contains($payload['body'], 'Identitas privat'))->andReturn(['success' => true, 'expired' => false]);
    $client->shouldReceive('send')->once()->withArgs(fn ($subscription, $payload) => str_ends_with($subscription['endpoint'], '/b')
        && $payload['tag'] === $secondId && ! str_contains($payload['body'], 'Identitas privat'))->andReturn(['success' => true, 'expired' => false]);
    expect(app(WebPushSender::class)->sendPending())->toBe(2)->and(app(WebPushSender::class)->sendPending())->toBe(0);
    $this->assertDatabaseCount('bantuan_web_deliveries', 2);
    $this->assertDatabaseMissing('bantuan_web_deliveries', ['notification_id' => $old]);
});

it('does not send after session revocation, expiry, inactive account or revoked module access', function (string $revocation) {
    [$user, $token] = browserActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', browserSubscription())->assertNoContent();
    browserNote($user->id);
    match ($revocation) {
        'logout' => $this->postJson('/api/v1/auth/logout')->assertOk(),
        'expired' => DB::table('personal_access_tokens')->where('id', $token->accessToken->id)->update(['expires_at' => now()->subMinute()]),
        'inactive' => DB::table('users')->where('id', $user->id)->update(['is_active' => false]),
        'module' => DB::table('module_access')->where('user_id', $user->id)->delete(),
        'disabled-module' => DB::table('modules')->where('slug', 'bantuan')->update(['is_active' => false]),
    };
    $this->mock(WebPushClient::class)->shouldNotReceive('send');
    expect(app(WebPushSender::class)->sendPending())->toBe(0);
})->with(['logout', 'expired', 'inactive', 'module', 'disabled-module']);

it('retries failures and removes expired browser subscriptions', function () {
    [$user, $token] = browserActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/web-push/subscriptions', browserSubscription())->assertNoContent();
    browserNote($user->id);
    $client = $this->mock(WebPushClient::class);
    $client->shouldReceive('send')->once()->andReturn(['success' => false, 'expired' => false]);
    expect(app(WebPushSender::class)->sendPending())->toBe(0);
    $this->assertDatabaseCount('bantuan_web_deliveries', 0);
    $this->assertDatabaseCount('bantuan_web_subscriptions', 1);
    $client->shouldReceive('send')->once()->andReturn(['success' => false, 'expired' => true]);
    expect(app(WebPushSender::class)->sendPending())->toBe(0);
    $this->assertDatabaseCount('bantuan_web_subscriptions', 0);
});

it('encrypts and signs the actual browser push request without making a network call', function () {
    $history = [];
    $stack = HandlerStack::create(new MockHandler([
        new Response(201), new Response(410),
    ]));
    $stack->push(Middleware::history($history));
    $client = new WebPushClient(new Client(['handler' => $stack]));
    $subscription = browserSubscription();
    $keys = VAPID::createVapidKeys();
    expect($client->send($subscription, ['body' => 'Secret test body'], $keys))->toBe(['success' => true, 'expired' => false]);
    $request = $history[0]['request'];
    expect($request->getHeaderLine('Content-Encoding'))->toBe('aes128gcm')
        ->and(str_starts_with($request->getHeaderLine('Authorization'), 'vapid '))->toBeTrue()
        ->and(str_contains((string) $request->getBody(), 'Secret test body'))->toBeFalse();
    expect($client->send($subscription, ['body' => 'retry'], $keys))->toBe(['success' => false, 'expired' => true]);
});
