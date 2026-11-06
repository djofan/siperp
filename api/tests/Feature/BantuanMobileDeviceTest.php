<?php

use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function deviceAccount(bool $access = true): array
{
    $user = new User;
    $user->forceFill(['name' => 'Device test', 'email' => Str::uuid().'@example.test',
        'password_hash' => bcrypt('device-test-password'), 'is_active' => true, 'is_superadmin' => false])->save();
    if ($access) {
        DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id,
            'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => 'verifier']);
    }

    return [$user, app(TokenIssuer::class)->issue($user, 'bantuan-mobile')];
}

it('registers once rotates tokens and moves a shared device to its new login owner', function () {
    [$a, $first] = deviceAccount();
    [$b, $second] = deviceAccount();
    $this->withToken($first->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-original'])->assertNoContent();
    $this->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-original'])->assertNoContent();
    $this->assertDatabaseCount('bantuan_mobile_devices', 1);
    $this->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-rotated'])->assertNoContent();
    $this->assertDatabaseCount('bantuan_mobile_devices', 1);
    $this->assertDatabaseMissing('bantuan_mobile_devices', ['token_hash' => hash('sha256', 'device-original')]);
    app('auth')->forgetGuards();
    $this->withToken($second->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-rotated'])->assertNoContent();
    $device = DB::table('bantuan_mobile_devices')->sole();
    expect($device->user_id)->toBe($b->id)->and($device->access_token_id)->toBe($second->accessToken->id)
        ->and(decrypt($device->token))->toBe('device-rotated')->and($device->token)->not->toBe('device-rotated');
    app('auth')->forgetGuards();
    $this->withToken($first->plainTextToken)->deleteJson('/api/v1/bantuan/mobile/devices')->assertNoContent();
    $this->assertDatabaseCount('bantuan_mobile_devices', 1);
    app('auth')->forgetGuards();
    $this->withToken($second->plainTextToken)->deleteJson('/api/v1/bantuan/mobile/devices')->assertNoContent();
    $this->assertDatabaseCount('bantuan_mobile_devices', 0);
    expect($a->tokens()->count())->toBe(1)->and($b->tokens()->count())->toBe(1);
});

it('rejects invalid device registration input', function (array $input) {
    [, $token] = deviceAccount();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', $input)
        ->assertUnprocessable()->assertJsonPath('error.code', 'validation_failed');
    $this->assertDatabaseCount('bantuan_mobile_devices', 0);
})->with([
    'missing' => [[]], 'empty' => [['token' => '']], 'structured' => [['token' => ['invalid']]],
    'too long' => [['token' => str_repeat('x', 4097)]],
]);

it('rejects registration without current active module access', function (string $case) {
    [$user, $token] = deviceAccount($case !== 'no-access');
    if ($case === 'inactive-user') {
        DB::table('users')->where('id', $user->id)->update(['is_active' => false]);
    }
    if ($case === 'inactive-module') {
        DB::table('modules')->where('slug', 'bantuan')->update(['is_active' => false]);
    }
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-test'])
        ->assertStatus($case === 'inactive-user' ? 401 : 403);
    $this->assertDatabaseCount('bantuan_mobile_devices', 0);
})->with(['no-access', 'inactive-user', 'inactive-module']);

it('rejects expired tokens and documents the protected route without duplicate registration', function () {
    [, $token] = deviceAccount();
    $this->travel(8)->days();
    $this->withToken($token->plainTextToken)->postJson('/api/v1/bantuan/mobile/devices', ['token' => 'device-test'])->assertUnauthorized();
    $route = app('router')->getRoutes()->match(Request::create('/api/v1/bantuan/mobile/devices', 'POST'));
    expect($route->gatherMiddleware())->toContain('auth:sanctum', 'user.active', 'module.access:bantuan');
    $contract = json_decode(file_get_contents(base_path('docs/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
    expect($contract['paths']['/api/v1/bantuan/mobile/devices']['post']['responses'])->toHaveKey(204);
});
