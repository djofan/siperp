<?php

use App\Modules\Bantuan\Services\FcmClient;
use App\Modules\Bantuan\Services\MobilePush;
use App\Modules\Core\Models\User;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function pushActor(): array
{
    $u = new User;
    $u->forceFill(['name' => 'Push test', 'email' => Str::uuid().'@example.test', 'password_hash' => Hash::make('push-test-password'), 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $u->id, 'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => 'verifier']);

    return [$u, $u->createToken('bantuan-mobile', ['*'], now()->addDays(7))];
}

it('registers encrypted device tokens and isolates logout to the current mobile session', function () {
    [$a, $ta] = pushActor();
    [$b, $tb] = pushActor();
    $this->withToken($ta->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-a'])->assertNoContent();
    app('auth')->forgetGuards();
    $this->withToken($tb->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-b'])->assertNoContent();
    $device = DB::table('bantuan_mobile_devices')->where('user_id', $a->id)->first();
    expect($device->token)->not->toBe('device-a')->and(decrypt($device->token))->toBe('device-a');
    app('auth')->forgetGuards();
    $this->withToken($ta->plainTextToken)->deleteJson('/api/v1/bantuan/mobile/session')->assertNoContent();
    expect(DB::table('bantuan_mobile_devices')->count())->toBe(1)->and($a->tokens()->count())->toBe(0)->and($b->tokens()->count())->toBe(1);
});

it('requires mobile authentication and validates device tokens', function () {
    $this->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'test'])->assertUnauthorized();
    [$u, $token] = pushActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', [])->assertUnprocessable();
    $web = $u->createToken('next-server');
    app('auth')->forgetGuards();
    $this->withToken($web->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'test'])->assertForbidden();
});

it('sends unread owner notifications once and stops after module access is revoked', function () {
    $this->travelTo(now()->startOfSecond());
    config(['bantuan-mobile.credentials' => 'mocked-private-path']);
    [$u, $token] = pushActor();
    [$other] = pushActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'test-device'])->assertNoContent();
    foreach ([[$u, null], [$other, null], [$u, now()]] as [$owner, $read]) {
        DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'application_id' => (string) Str::uuid(), 'user_id' => $owner->id, 'message' => 'Private notification content', 'created_at' => now(), 'read_at' => $read]);
    }
    $client = Mockery::mock(FcmClient::class);
    $client->shouldReceive('send')->once()->withArgs(fn ($message) => $message['token'] === 'test-device' && ! str_contains($message['notification']['body'], 'Private notification content'))
        ->andReturn(new Illuminate\Http\Client\Response(new Response(200, [], '{"name":"test"}')));
    app()->instance(FcmClient::class, $client);
    expect(app(MobilePush::class)->sendPending())->toBe(1)->and(app(MobilePush::class)->sendPending())->toBe(0);
    DB::table('module_access')->where('user_id', $u->id)->delete();
    DB::table('bantuan_mobile_deliveries')->delete();
    expect(app(MobilePush::class)->sendPending())->toBe(0);
});

it('retries failed delivery and deletes expired sessions without sending', function () {
    $this->travelTo(now()->startOfSecond());
    config(['bantuan-mobile.credentials' => 'mocked-private-path']);
    [$u, $token] = pushActor();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'test-device'])->assertNoContent();
    DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'application_id' => (string) Str::uuid(), 'user_id' => $u->id, 'message' => 'Test', 'created_at' => now()]);
    $client = Mockery::mock(FcmClient::class);
    $client->shouldReceive('send')->once()->andReturn(new Illuminate\Http\Client\Response(new Response(503, [], '{}')));
    app()->instance(FcmClient::class, $client);
    expect(app(MobilePush::class)->sendPending())->toBe(0)->and(DB::table('bantuan_mobile_deliveries')->count())->toBe(0);
    DB::table('personal_access_tokens')->where('id', $token->accessToken->id)->update(['expires_at' => now()->subMinute()]);
    expect(app(MobilePush::class)->sendPending())->toBe(0)->and(DB::table('bantuan_mobile_devices')->count())->toBe(0);
});
