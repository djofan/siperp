<?php

use App\Modules\Bantuan\Services\FcmClient;
use App\Modules\Bantuan\Services\PwaPush;
use App\Modules\Bantuan\Services\PwaPushSettings;
use App\Modules\Core\Models\User;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function pwaPushActor(string $kind = 'next-server'): array
{
    $user = new User;
    $user->forceFill(['name' => 'PWA test', 'email' => Str::uuid().'@example.test', 'password_hash' => bcrypt('test-password-only'), 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => 'volunteer']);
    return [$user, $user->createToken($kind, ['*'], now()->addDays(7))];
}

beforeEach(function () {
    config(['bantuan-mobile.credentials' => 'mock-server-path', 'bantuan-mobile.web' => [
        'apiKey' => 'web-public-example', 'projectId' => 'example-project', 'messagingSenderId' => '123456', 'appId' => 'example-app', 'vapidKey' => 'example-public-vapid',
        'private_key' => 'must-never-appear',
    ]]);
});

it('requires web auth and exposes only public config and an opaque binding', function () {
    $this->getJson('/api/v1/bantuan/pwa/push-context')->assertUnauthorized();
    [$user, $token] = pwaPushActor();
    $response = $this->withToken($token->plainTextToken)->getJson('/api/v1/bantuan/pwa/push-context')->assertOk()->assertJsonPath('data.enabled', true)->assertJsonPath('data.registered', false);
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue();
    expect($response->json('data.firebase'))->not->toHaveKey('private_key');
    expect($response->getContent())->not->toContain('mock-server-path', 'must-never-appear', $token->plainTextToken);
    expect($response->json('data.binding'))->toHaveLength(64)->not->toBe($token->accessToken->id);
    config(['bantuan-mobile.web.vapidKey' => null]);
    $this->getJson('/api/v1/bantuan/pwa/push-context')->assertOk()->assertJsonPath('data.enabled', false)->assertJsonPath('data.firebase', null);
    app('auth')->forgetGuards();
    [$native, $mobile] = pwaPushActor('bantuan-mobile');
    $this->withToken($mobile->plainTextToken)->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'x'])->assertForbidden();
});

it('registers web cookies with origin protection and encrypts and rotates FCM tokens', function () {
    [$user, $token] = pwaPushActor();
    $origin = config('frontend.origins')[0];
    $this->withCredentials()->withUnencryptedCookie('sip_session', $token->plainTextToken)->withHeader('Origin', $origin)
        ->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'browser-one'])->assertNoContent();
    $row = DB::table('bantuan_pwa_devices')->first();
    expect(decrypt($row->token))->toBe('browser-one')->and($row->token)->not->toBe('browser-one');
    $created = $row->created_at;
    $this->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'browser-one'])->assertNoContent();
    expect(DB::table('bantuan_pwa_devices')->count())->toBe(1)->and(DB::table('bantuan_pwa_devices')->first()->created_at)->toBe($created);
    $this->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'browser-two'])->assertNoContent();
    expect(DB::table('bantuan_pwa_devices')->count())->toBe(1)->and(decrypt(DB::table('bantuan_pwa_devices')->first()->token))->toBe('browser-two');
    $this->withHeader('Origin', 'https://untrusted.example')->deleteJson('/api/v1/bantuan/pwa/devices')->assertForbidden();
});

it('moves a shared browser to the new session and unregisters only its current owner', function () {
    [$a, $ta] = pwaPushActor();[$b, $tb] = pwaPushActor();
    $this->withToken($ta->plainTextToken)->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'shared-browser'])->assertNoContent();
    app('auth')->forgetGuards();
    $this->withToken($tb->plainTextToken)->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'shared-browser'])->assertNoContent();
    expect(DB::table('bantuan_pwa_devices')->first()->user_id)->toBe($b->id);
    app('auth')->forgetGuards();
    $this->withToken($ta->plainTextToken)->deleteJson('/api/v1/bantuan/pwa/devices')->assertNoContent();
    expect(DB::table('bantuan_pwa_devices')->count())->toBe(1);
    DB::table('module_access')->where('user_id', $b->id)->delete();
    app('auth')->forgetGuards();
    $this->withToken($tb->plainTextToken)->deleteJson('/api/v1/bantuan/pwa/devices')->assertNoContent();
    expect(DB::table('bantuan_pwa_devices')->count())->toBe(0);
});

it('sends only new unread owner notifications once without private notification text', function () {
    $this->travelTo(now()->startOfSecond());
    [$user, $token] = pwaPushActor();[$other] = pwaPushActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'web-device'])->assertNoContent();
    foreach ([[$user, null, now()], [$other, null, now()], [$user, now(), now()], [$user, null, now()->subDay()]] as [$owner, $read, $created]) {
        DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'application_id' => (string) Str::uuid(), 'user_id' => $owner->id, 'message' => 'Private beneficiary details', 'read_at' => $read, 'created_at' => $created]);
    }
    $client = Mockery::mock(FcmClient::class);
    $client->shouldReceive('send')->once()->withArgs(function ($message) use ($token) {
        return $message['token'] === 'web-device' && ! isset($message['notification']) && $message['data']['type'] === 'bantuan_pwa'
            && $message['data']['binding'] === app(PwaPushSettings::class)->binding($token->accessToken->id)
            && ! str_contains(json_encode($message), 'Private beneficiary details') && $message['webpush']['headers']['TTL'] === '60';
    })->andReturn(new Illuminate\Http\Client\Response(new Response(200, [], '{"name":"example"}')));
    app()->instance(FcmClient::class, $client);
    expect(app(PwaPush::class)->sendPending())->toBe(1)->and(app(PwaPush::class)->sendPending())->toBe(0);
    DB::table('bantuan_pwa_deliveries')->delete();DB::table('module_access')->where('user_id', $user->id)->delete();
    expect(app(PwaPush::class)->sendPending())->toBe(0);
});

it('retries failed sends and drops registrations after session revocation', function () {
    [$user, $token] = pwaPushActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'web-device'])->assertNoContent();
    DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'application_id' => (string) Str::uuid(), 'user_id' => $user->id, 'message' => 'New update', 'created_at' => now()]);
    $client = Mockery::mock(FcmClient::class);
    $client->shouldReceive('send')->once()->andReturn(new Illuminate\Http\Client\Response(new Response(503, [], '{}')));
    app()->instance(FcmClient::class, $client);
    expect(app(PwaPush::class)->sendPending())->toBe(0)->and(DB::table('bantuan_pwa_deliveries')->count())->toBe(0);
    DB::table('personal_access_tokens')->where('id', $token->accessToken->id)->delete();
    expect(app(PwaPush::class)->sendPending())->toBe(0)->and(DB::table('bantuan_pwa_devices')->count())->toBe(0);
});

it('rejects malformed registration and incomplete server configuration', function () {
    [$user, $token] = pwaPushActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/pwa/devices', [])->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/pwa/devices', ['token' => str_repeat('x', 4097)])->assertUnprocessable();
    config(['bantuan-mobile.web.appId' => null]);
    $this->postJson('/api/v1/bantuan/pwa/devices', ['token' => 'browser'])->assertStatus(503);
    expect(app(PwaPush::class)->sendPending())->toBe(0);
});
