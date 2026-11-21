<?php

use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Models\User;
use App\Modules\Lazsip\Models\Affiliate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    DB::table('modules')->insert(['id' => 'lazsip-affiliate-test', 'slug' => 'lazsip', 'name' => 'LAZSIP', 'is_active' => true]);
});

function affiliatePayload(array $extra = []): array
{
    return array_replace(['name' => 'Mitra Pengujian', 'email' => 'mitra@example.test', 'phone' => '081234567890',
        'password' => 'test-affiliate-password', 'password_confirmation' => 'test-affiliate-password'], $extra);
}

function affiliateAccount(string $email = 'existing@example.test'): User
{
    $user = new User;
    $user->forceFill(['name' => 'Existing ERP', 'email' => $email, 'password_hash' => Hash::make('test-affiliate-password'), 'is_active' => true, 'is_superadmin' => false])->save();

    return $user;
}

it('registers an immediately active Core account with private cookie and no admin access', function () {
    config(['frontend.secure_cookie' => true]);
    $response = $this->postJson('/api/v1/lazsip/affiliate/registrations', affiliatePayload([
        'is_superadmin' => true, 'role' => 'admin', 'user_id' => 'another-user', 'is_active' => false, 'code' => 'SASIP01',
    ]))->assertCreated()->assertHeader('Location', url('/api/v1/lazsip/affiliate/me'))->assertHeader('Cache-Control', 'no-store, private')->assertCookie('sip_session');
    $user = User::where('email', 'mitra@example.test')->firstOrFail();
    expect($user->is_active)->toBeTrue()->and($user->is_superadmin)->toBeFalse()
        ->and(Hash::check('test-affiliate-password', $user->password_hash))->toBeTrue()
        ->and(AccountCodes::find($user->code)->id)->toBe($user->id)
        ->and(DB::table('module_access')->where('user_id', $user->id)->count())->toBe(0);
    $response->assertJsonPath('data.isActive', true)->assertJsonPath('data.features.withdrawals', false)
        ->assertJsonMissingPath('data.code')->assertJsonMissingPath('data.token')->assertJsonMissingPath('data.password_hash')->assertJsonMissingPath('data.user_id');
    expect(array_keys($response->json('data')))->toEqualCanonicalizing(['id', 'name', 'email', 'phone', 'isActive', 'joinedAt', 'referralCode', 'referralPath', 'features']);
    $cookie = collect($response->headers->getCookies())->first(fn ($item) => $item->getName() === 'sip_session');
    expect($cookie->isHttpOnly())->toBeTrue()->and($cookie->isSecure())->toBeTrue()->and($cookie->getSameSite())->toBe('lax');
    $this->withToken($cookie->getValue())->getJson('/api/v1/lazsip/affiliate/me')->assertOk()->assertJsonPath('data.email', $user->email);
    $this->withToken($cookie->getValue())->getJson('/api/v1/lazsip/dashboard')->assertForbidden();
    $this->withToken($cookie->getValue())->getJson('/api/v1/lazsip/donors')->assertForbidden();
    $this->withToken($cookie->getValue())->getJson('/api/v1/lazsip/admin/beneficiaries')->assertForbidden();
    $this->withToken($cookie->getValue())->postJson('/api/v1/lazsip/campaigns', ['title' => 'Escalation'])->assertForbidden();
});

it('logs in through normalized email and automatically enrolls an existing ERP account only once', function () {
    $user = affiliateAccount();
    $url = '/api/v1/lazsip/affiliate/sessions';
    $this->postJson($url, ['email' => '  '.strtoupper($user->email).'  ', 'password' => 'test-affiliate-password', 'remember' => true])
        ->assertOk()->assertCookie('sip_session')->assertJsonPath('data.email', $user->email)->assertJsonPath('data.phone', null);
    $this->postJson($url, ['email' => $user->email, 'password' => 'test-affiliate-password'])->assertOk();
    expect(Affiliate::where('user_id', $user->id)->count())->toBe(1)
        ->and(User::count())->toBe(1)->and(DB::table('module_access')->count())->toBe(0);
    $token = $user->tokens()->latest('id')->firstOrFail();
    expect($token->name)->toBe('next-server')->and($token->expires_at)->not->toBeNull();
});

it('rejects wrong unknown and inactive account credentials without creating memberships or tokens', function () {
    $user = affiliateAccount();
    $url = '/api/v1/lazsip/affiliate/sessions';
    $this->postJson($url, ['email' => $user->email, 'password' => 'wrong'])->assertUnauthorized()->assertJsonPath('error.code', 'unauthenticated')->assertJsonPath('error.diagnosticCode', 'LOGIN_INVALID_CREDENTIALS')->assertJsonPath('error.message', fn (string $message) => str_starts_with($message, 'Email atau password salah.'));
    $this->postJson($url, ['email' => 'unknown@example.test', 'password' => 'wrong'])->assertUnauthorized();
    $user->is_active = false;
    $user->save();
    $this->postJson($url, ['email' => $user->email, 'password' => 'test-affiliate-password'])->assertUnauthorized();
    expect(Affiliate::count())->toBe(0)->and($user->tokens()->count())->toBe(0);
});

it('does not reactivate suspended affiliate membership on login', function () {
    $user = affiliateAccount();
    (new Affiliate)->forceFill(['user_id' => $user->id, 'is_active' => false])->save();
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => $user->email, 'password' => 'test-affiliate-password'])->assertForbidden();
    expect(Affiliate::first()->is_active)->toBeFalse()->and($user->tokens()->count())->toBe(0);
});

it('validates registration including types passwords contacts and duplicate existing ERP email', function () {
    $url = '/api/v1/lazsip/affiliate/registrations';
    $this->postJson($url, [])->assertUnprocessable()->assertJsonPath('error.code', 'validation_failed');
    $this->postJson($url, affiliatePayload(['phone' => '08abc123']))->assertUnprocessable();
    $this->postJson($url, affiliatePayload(['password_confirmation' => 'different-password']))->assertUnprocessable();
    $this->postJson($url, affiliatePayload(['email' => ['bad'], 'password' => ['bad']]))->assertUnprocessable();
    $this->postJson($url, affiliatePayload(['password' => 'short', 'password_confirmation' => 'short']))->assertUnprocessable();
    expect(User::count())->toBe(0)->and(Affiliate::count())->toBe(0);
});

it('rejects duplicate email case insensitively and never attaches to an existing account without credentials', function () {
    $user = affiliateAccount('Existing@Example.test');
    $this->postJson('/api/v1/lazsip/affiliate/registrations', affiliatePayload(['email' => 'EXISTING@example.test']))->assertUnprocessable();
    expect(User::count())->toBe(1)->and(Affiliate::count())->toBe(0)->and($user->tokens()->count())->toBe(0);
});

it('rejects oversized multibyte passwords and missing login input', function () {
    $password = str_repeat('界', 30);
    $this->postJson('/api/v1/lazsip/affiliate/registrations', affiliatePayload(['password' => $password, 'password_confirmation' => $password]))->assertUnprocessable();
    $this->postJson('/api/v1/lazsip/affiliate/sessions', [])->assertUnprocessable();
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => 'not-an-email', 'password' => 'wrong'])->assertUnprocessable();
});

it('keeps own profile reads and updates private without trusting submitted ownership or privileges', function () {
    $one = affiliateAccount('one@example.test');
    $two = affiliateAccount('two@example.test');
    $first = (new Affiliate)->forceFill(['user_id' => $one->id, 'phone' => '081234567890', 'is_active' => true]);
    $first->save();
    $second = (new Affiliate)->forceFill(['user_id' => $two->id, 'phone' => '089999999999', 'is_active' => true]);
    $second->save();
    Sanctum::actingAs($one);
    $this->getJson('/api/v1/lazsip/affiliate/me?user_id='.$two->id)->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('data.id', $first->id)->assertJsonMissing(['email' => 'two@example.test']);
    $this->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Updated Owner', 'email' => 'updated@example.test', 'phone' => '+6281234567890', 'user_id' => $two->id, 'is_active' => false, 'is_superadmin' => true])
        ->assertOk()->assertJsonPath('data.name', 'Updated Owner')->assertJsonPath('data.id', $first->id);
    expect($two->refresh()->name)->toBe('Existing ERP')->and($second->refresh()->phone)->toBe('089999999999')
        ->and($one->refresh()->is_superadmin)->toBeFalse()->and($first->refresh()->is_active)->toBeTrue();
    $this->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Conflict', 'email' => $two->email, 'phone' => '081234567890'])->assertUnprocessable();
    expect($one->refresh()->name)->toBe('Updated Owner');
});

it('does not create affiliate profiles during reads and rejects unauthenticated or suspended access', function () {
    $this->getJson('/api/v1/lazsip/affiliate/me')->assertUnauthorized();
    $this->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Guest'])->assertUnauthorized();
    $user = affiliateAccount();
    Sanctum::actingAs($user);
    $this->getJson('/api/v1/lazsip/affiliate/me')->assertForbidden();
    $this->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Not a member'])->assertForbidden();
    expect(Affiliate::count())->toBe(0);
    (new Affiliate)->forceFill(['user_id' => $user->id, 'is_active' => false])->save();
    $this->getJson('/api/v1/lazsip/affiliate/me')->assertForbidden();
});

it('honors module availability and does not alter ordinary Core web login', function () {
    $user = affiliateAccount();
    $this->postJson('/api/v1/auth/login', ['code' => $user->code, 'password' => 'test-affiliate-password'])->assertOk()->assertCookie('sip_session');
    expect(Affiliate::count())->toBe(0);
    DB::table('modules')->where('slug', 'lazsip')->update(['is_active' => false]);
    $this->postJson('/api/v1/lazsip/affiliate/registrations', affiliatePayload())->assertNotFound();
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => $user->email, 'password' => 'test-affiliate-password'])->assertNotFound();
    expect(Affiliate::count())->toBe(0);
});

it('limits repeated login and public registration attempts', function () {
    $user = affiliateAccount();
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => $i % 2 ? strtoupper($user->email) : ' '.$user->email.' ', 'password' => 'wrong'])->assertUnauthorized();
    }
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => $user->email, 'password' => 'test-affiliate-password'])->assertTooManyRequests()->assertHeader('Retry-After');
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/lazsip/affiliate/registrations', [])->assertUnprocessable();
    }
    $this->postJson('/api/v1/lazsip/affiliate/registrations', [])->assertTooManyRequests();
});

it('rejects cross origin registration and cookie profile writes', function () {
    $this->withHeader('Origin', 'https://foreign.example')->postJson('/api/v1/lazsip/affiliate/registrations', affiliatePayload())->assertForbidden();
    expect(User::count())->toBe(0);
    $user = affiliateAccount();
    (new Affiliate)->forceFill(['user_id' => $user->id, 'is_active' => true])->save();
    $token = $user->createToken('next-server')->plainTextToken;
    $this->withUnencryptedCookie('sip_session', $token)->withHeader('Origin', 'https://foreign.example')
        ->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Wrong origin', 'email' => 'changed@example.test', 'phone' => '081234567890'])->assertForbidden();
    expect($user->refresh()->name)->toBe('Existing ERP');
});

it('logs out through Core and revokes only the current session', function () {
    $user = affiliateAccount();
    (new Affiliate)->forceFill(['user_id' => $user->id, 'is_active' => true])->save();
    $current = $user->createToken('next-server');
    $other = $user->createToken('next-server');
    $this->withToken($current->plainTextToken)->postJson('/api/v1/auth/logout')->assertOk()->assertCookieExpired('sip_session');
    expect($user->tokens()->whereKey($current->accessToken->id)->exists())->toBeFalse()
        ->and($user->tokens()->whereKey($other->accessToken->id)->exists())->toBeTrue();
});

it('rejects code-only affiliate login while keeping account-code Core login available', function () {
    $user = affiliateAccount();
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['code' => $user->code, 'password' => 'test-affiliate-password'])->assertUnprocessable();
    $this->postJson('/api/v1/auth/login', ['code' => $user->code, 'password' => 'test-affiliate-password'])->assertOk();
    expect(Affiliate::count())->toBe(0);
});

it('uses the changed profile email for subsequent affiliate login', function () {
    $user = affiliateAccount('old@example.test');
    (new Affiliate)->forceFill(['user_id' => $user->id, 'is_active' => true])->save();
    Sanctum::actingAs($user);
    $this->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Updated', 'email' => 'NEW@example.test', 'phone' => '081234567890'])->assertOk()->assertJsonPath('data.email', 'new@example.test');
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => 'old@example.test', 'password' => 'test-affiliate-password'])->assertUnauthorized();
    $this->postJson('/api/v1/lazsip/affiliate/sessions', ['email' => 'new@example.test', 'password' => 'test-affiliate-password'])->assertOk();
    expect(Affiliate::count())->toBe(1);
});

it('generates unique persistent random referral codes without accepting client supplied codes', function () {
    $response = $this->postJson('/api/v1/lazsip/affiliate/registrations', affiliatePayload(['referralCode' => str_repeat('a', 20)]))->assertCreated();
    $first = Affiliate::firstOrFail();
    expect($first->referral_code)->toMatch('/^[a-f0-9]{20}$/')->not->toBe(str_repeat('a', 20));
    $response->assertJsonPath('data.referralCode', $first->referral_code)->assertJsonPath('data.referralPath', '/lazsip/r/'.$first->referral_code);
    $other = affiliateAccount('referral-other@example.test');
    $second = (new Affiliate)->forceFill(['user_id' => $other->id, 'is_active' => true]);
    $second->save();
    expect($second->referral_code)->not->toBe($first->referral_code);
    $original = $first->referral_code;
    Sanctum::actingAs($first->user);
    $this->putJson('/api/v1/lazsip/affiliate/me', ['name' => 'Updated Referral Owner', 'email' => 'referral-updated@example.test', 'phone' => '081234567890', 'referral_code' => $second->referral_code])->assertOk()->assertJsonPath('data.referralCode', $original);
    $this->getJson('/api/v1/lazsip/affiliate/me')->assertOk()->assertJsonPath('data.referralCode', $original);
    expect($first->refresh()->referral_code)->toBe($original);
});

it('resolves active public referral codes without exposing affiliate identity and disables inactive links', function () {
    $user = affiliateAccount();
    $affiliate = (new Affiliate)->forceFill(['user_id' => $user->id, 'is_active' => true]);
    $affiliate->save();
    $url = '/api/v1/lazsip/affiliate/referrals/'.$affiliate->referral_code;
    $this->getJson($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertExactJson(['data' => ['referralCode' => $affiliate->referral_code]]);
    $this->getJson('/api/v1/lazsip/affiliate/referrals/'.str_repeat('0', 20))->assertNotFound();
    $this->getJson('/api/v1/lazsip/affiliate/referrals/not-a-code')->assertNotFound();
    $affiliate->is_active = false;
    $affiliate->save();
    $this->getJson($url)->assertNotFound();
    $affiliate->is_active = true;
    $affiliate->save();
    $user->is_active = false;
    $user->save();
    $this->getJson($url)->assertNotFound();
    expect(Affiliate::count())->toBe(1);
});
