<?php

use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Models\PersonalAccessToken;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function mobileLoginAccount(bool $access = true, bool $active = true, bool $superadmin = false): User
{
    $user = new User;
    $user->forceFill(['name' => 'Mobile test', 'email' => Str::uuid().'@example.test',
        'password_hash' => Hash::make('mobile-test-password'), 'is_active' => $active, 'is_superadmin' => $superadmin])->save();
    if ($access) {
        DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id,
            'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => 'verifier']);
    }

    return $user;
}

function mobileLoginInput(User $user): array
{
    return ['code' => ' '.strtolower($user->code).' ', 'password' => 'mobile-test-password'];
}

it('issues a Core-expiring mobile Bearer token that accesses only the owners notifications', function () {
    $this->travelTo(now()->startOfSecond());
    $user = mobileLoginAccount();
    $other = mobileLoginAccount();
    foreach ([$user, $other] as $owner) {
        DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'user_id' => $owner->id,
            'application_id' => (string) Str::uuid(), 'message' => 'Test notification', 'created_at' => now()]);
    }
    AccountCodes::register($user->id, 'MOBILE-ALIAS');
    $response = $this->postJson('/api/v1/bantuan/mobile/login', ['code' => ' mobile-alias ', 'password' => 'mobile-test-password'])
        ->assertOk()->assertCookieMissing('sip_session');
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue();
    expect(array_keys($response->json()))->toBe(['data'])
        ->and(array_keys($response->json('data')))->toBe(['token', 'expires_at']);
    $token = PersonalAccessToken::findToken($response->json('data.token'));
    expect($token->name)->toBe('bantuan-mobile')
        ->and($token->tokenable_id)->toBe($user->id)
        ->and($token->expires_at->equalTo(now()->addDays(7)))->toBeTrue()
        ->and($response->json('data.expires_at'))->toBe($token->expires_at->toIso8601String())
        ->and($token->token)->not->toBe($response->json('data.token'));
    $this->withToken($response->json('data.token'))->getJson('/api/v1/bantuan/notifications')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.user_id', $user->id);
});

it('rejects wrong credentials and inactive accounts without issuing a token', function (string $case) {
    $user = mobileLoginAccount(active: $case !== 'inactive');
    $input = mobileLoginInput($user);
    if ($case === 'password') {
        $input['password'] = 'incorrect';
    }
    if ($case === 'unknown') {
        $input['code'] = 'UNKNOWN-CODE';
    }
    $this->postJson('/api/v1/bantuan/mobile/login', $input)->assertUnauthorized()->assertJsonPath('error.code', 'unauthenticated');
    expect($user->tokens()->count())->toBe(0);
})->with(['password', 'unknown', 'inactive']);

it('denies missing access and inactive modules before issuing tokens', function (string $case) {
    $user = mobileLoginAccount(access: $case !== 'no-access');
    if ($case === 'inactive-module') {
        DB::table('modules')->where('slug', 'bantuan')->update(['is_active' => false]);
    }
    $this->postJson('/api/v1/bantuan/mobile/login', mobileLoginInput($user))
        ->assertForbidden()->assertJsonPath('error.code', 'forbidden');
    expect($user->tokens()->count())->toBe(0);
})->with(['no-access', 'inactive-module']);

it('preserves the Core superadmin bypass for a registered inactive module', function () {
    $user = mobileLoginAccount(access: false, superadmin: true);
    DB::table('modules')->where('slug', 'bantuan')->update(['is_active' => false]);
    $token = $this->postJson('/api/v1/bantuan/mobile/login', mobileLoginInput($user))->assertOk()->json('data.token');
    $this->withToken($token)->getJson('/api/v1/bantuan/notifications')->assertOk();
});

it('validates mobile login with Core LoginRequest', function (array $input) {
    $this->postJson('/api/v1/bantuan/mobile/login', $input)->assertUnprocessable()
        ->assertJsonPath('error.code', 'validation_failed');
    $this->assertDatabaseCount('personal_access_tokens', 0);
})->with([
    'empty' => [[]],
    'email' => [['code' => 'user@example.test', 'password' => 'test']],
    'array password' => [['code' => 'TEST-CODE', 'password' => ['invalid']]],
    'long password' => [['code' => 'TEST-CODE', 'password' => str_repeat('x', 73)]],
]);

it('shares the normalized Core login throttle with web login', function () {
    $user = mobileLoginAccount();
    for ($i = 0; $i < 5; $i++) {
        $path = $i % 2 ? '/api/v1/auth/login' : '/api/v1/bantuan/mobile/login';
        $this->postJson($path, [...mobileLoginInput($user), 'password' => 'incorrect'])->assertUnauthorized();
    }
    $this->postJson('/api/v1/bantuan/mobile/login', mobileLoginInput($user))->assertStatus(429)
        ->assertHeader('Retry-After')->assertJsonPath('error.code', 'rate_limited');
    expect($user->tokens()->count())->toBe(0);
});

it('keeps web login and its HttpOnly session cookie working independently', function () {
    $user = mobileLoginAccount();
    $web = $this->postJson('/api/v1/auth/login', mobileLoginInput($user))->assertOk()->assertCookie('sip_session')
        ->assertJsonPath('data.userId', $user->id)->assertJsonMissingPath('data.token');
    $cookie = collect($web->headers->getCookies())->first(fn ($cookie) => $cookie->getName() === 'sip_session');
    expect($cookie->isHttpOnly())->toBeTrue();
    $webToken = PersonalAccessToken::findToken($cookie->getValue());
    expect($webToken->name)->toBe('next-server');
    $this->postJson('/api/v1/bantuan/mobile/login', mobileLoginInput($user))->assertOk()->assertCookieMissing('sip_session');
    $this->assertDatabaseHas('personal_access_tokens', ['id' => $webToken->id]);
    $this->withCredentials()->withUnencryptedCookie('sip_session', $cookie->getValue())->getJson('/api/v1/auth/me')
        ->assertOk()->assertJsonPath('data.userId', $user->id);
});

it('rejects expired mobile tokens on notifications', function () {
    $user = mobileLoginAccount();
    $token = $this->postJson('/api/v1/bantuan/mobile/login', mobileLoginInput($user))->assertOk()->json('data.token');
    $this->travel(8)->days();
    $this->withToken($token)->getJson('/api/v1/bantuan/notifications')->assertUnauthorized();
});

it('registers the documented mobile login with the shared limiter and no auth prerequisite', function () {
    $route = app('router')->getRoutes()->match(Request::create('/api/v1/bantuan/mobile/login', 'POST'));
    expect($route->gatherMiddleware())->toContain('api', 'throttle:login')
        ->not->toContain('auth:sanctum', 'module.access:bantuan');
    $contract = json_decode(file_get_contents(base_path('docs/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
    $operation = $contract['paths']['/api/v1/bantuan/mobile/login']['post'];
    expect($operation['security'])->toBe([])
        ->and(array_keys($operation['responses']))->toBe([200, 401, 403, 422, 429])
        ->and($contract['components']['schemas']['BantuanMobileToken']['properties']['data']['required'])->toBe(['token', 'expires_at']);
});

it('rechecks module access on subsequent notification requests', function () {
    $user = mobileLoginAccount();
    $token = $this->postJson('/api/v1/bantuan/mobile/login', mobileLoginInput($user))->assertOk()->json('data.token');
    DB::table('module_access')->where('user_id', $user->id)->delete();
    $this->withToken($token)->getJson('/api/v1/bantuan/notifications')->assertForbidden();
});
