<?php

use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function codeAccount(array $extra = []): User
{
    $user = new User;
    $user->forceFill(array_replace(['name' => 'Akun kode', 'email' => Str::uuid().'@example.test',
        'password_hash' => Hash::make('password-code-test'), 'is_active' => true, 'is_superadmin' => false], $extra))->save();
    return $user;
}

beforeEach(function () {
    foreach (['sip', 'sarsip', 'lazsip', 'payment', 'academy', 'teknisi', 'tanwir', 'ojol', 'bantuan'] as $slug) {
        DB::table('modules')->updateOrInsert(['slug' => $slug], ['id' => 'code-'.$slug, 'name' => $slug, 'is_active' => true]);
    }
});

it('uses code and password for every module without adding other module access', function (string $module) {
    $user = codeAccount();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => 'code-'.$module, 'role' => 'admin']);
    $this->postJson('/api/v1/auth/login', ['code' => strtolower($user->code), 'password' => 'password-code-test'])
        ->assertOk()->assertJsonPath('data.code', $user->code)->assertJsonPath('data.moduleSlugs', [$module])
        ->assertJsonPath('data.isSuperadmin', false)->assertCookie('sip_session');
})->with(['sip', 'sarsip', 'lazsip', 'payment', 'academy', 'teknisi', 'tanwir', 'ojol', 'bantuan']);

it('authenticates superadmin by code and keeps the password hash unchanged', function () {
    $user = codeAccount(['is_superadmin' => true]);
    $hash = $user->password_hash;
    $this->postJson('/api/v1/auth/login', ['code' => '  '.strtolower($user->code).'  ', 'password' => 'password-code-test'])
        ->assertOk()->assertJsonPath('data.isSuperadmin', true);
    expect($user->fresh()->password_hash)->toBe($hash);
});

it('rejects email login and old identifier fields on every login endpoint', function (string $path) {
    $user = codeAccount();
    $this->postJson('/api/v1/'.$path, ['email' => $user->email, 'password' => 'password-code-test'])->assertUnprocessable();
    $this->postJson('/api/v1/'.$path, ['code' => $user->email, 'password' => 'password-code-test'])->assertUnprocessable();
    $this->postJson('/api/v1/'.$path, ['nip' => $user->code, 'password' => 'password-code-test'])->assertUnprocessable();
    expect($user->tokens()->count())->toBe(0);
})->with(['auth/login', 'academy/masuk', 'teknisi/masuk', 'tanwir/auth/login', 'ojol/auth/login']);

it('rejects wrong passwords and inactive accounts without issuing tokens', function () {
    $user = codeAccount();
    $this->postJson('/api/v1/auth/login', ['code' => $user->code, 'password' => 'wrong'])->assertUnauthorized();
    $user->forceFill(['is_active' => false])->save();
    $this->postJson('/api/v1/auth/login', ['code' => $user->code, 'password' => 'password-code-test'])->assertUnauthorized();
    expect($user->tokens()->count())->toBe(0);
});

it('keeps the login throttle consistent across letter case and outer whitespace', function () {
    $user = codeAccount();
    for ($i = 0; $i < 5; $i++) {
        $code = $i % 2 ? strtolower($user->code) : ' '.$user->code.' ';
        $this->postJson('/api/v1/auth/login', ['code' => $code, 'password' => 'wrong'])->assertUnauthorized();
    }
    $this->postJson('/api/v1/auth/login', ['code' => $user->code, 'password' => 'password-code-test'])->assertTooManyRequests();
});

it('keeps participant codes working and refuses accounts outside the module', function (string $module, string $code, string $path) {
    $user = codeAccount(['code' => $code]);
    if ($module === 'academy') {
        DB::table('zakat_academy_profiles')->insert(['id' => 'code-profile', 'user_id' => $user->id, 'nis' => $code]);
    } elseif ($module === 'teknisi') {
        DB::table('teknisi_participants')->insert(['id' => 'code-profile', 'userId' => $user->id, 'nip' => $code, 'address' => 'Alamat']);
    } else {
        DB::table($module.'_members')->insert(['id' => 'code-profile', 'user_id' => $user->id, 'code' => $code, 'role' => 'peserta']);
    }
    $this->postJson('/api/v1/'.$path, ['code' => strtolower($code), 'password' => 'password-code-test'])
        ->assertOk()->assertJsonPath('data.userId', $user->id);
    $outsider = codeAccount();
    $this->postJson('/api/v1/'.$path, ['code' => $outsider->code, 'password' => 'password-code-test'])->assertUnauthorized();
    expect($outsider->tokens()->count())->toBe(0);
    DB::table('modules')->where('slug', $module)->update(['is_active' => false]);
    $this->postJson('/api/v1/'.$path, ['code' => $code, 'password' => 'password-code-test'])->assertForbidden();
})->with([['academy', 'PAZ001', 'academy/masuk'], ['teknisi', 'PTH01', 'teknisi/masuk'],
    ['tanwir', 'PTQ001', 'tanwir/auth/login'], ['ojol', 'POM001', 'ojol/auth/login']]);

it('allows module managers to use the same account code at their module login', function (string $module, string $path) {
    $user = codeAccount();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => 'code-'.$module, 'role' => 'admin']);
    $this->postJson('/api/v1/'.$path, ['code' => $user->code, 'password' => 'password-code-test'])->assertOk();
})->with([['academy', 'academy/masuk'], ['teknisi', 'teknisi/masuk'], ['tanwir', 'tanwir/auth/login'], ['ojol', 'ojol/auth/login']]);

it('creates accounts without email and exposes the generated code in management', function () {
    Sanctum::actingAs(codeAccount(['is_superadmin' => true]));
    $data = $this->postJson('/api/v1/super/akun', ['name' => 'Tanpa email', 'password' => 'password-code-test', 'moduleIds' => ['code-sip']])
        ->assertCreated()->assertJsonPath('data.email', '')->json('data');
    expect($data['code'])->toMatch('/^AMSIP\d{4,}$/');
    $this->getJson('/api/v1/super/akun/'.$data['id'])->assertOk()->assertJsonPath('data.code', $data['code']);
    $this->putJson('/api/v1/super/akun/'.$data['id'], ['name' => 'Diperbarui', 'email' => '', 'code' => 'UNTRUSTED-CODE'])
        ->assertOk()->assertJsonPath('data.code', $data['code']);
    expect(AccountCodes::find($data['code'])->id)->toBe($data['id']);
});

it('keeps Core login independent from optional module profile tables', function () {
    $user = codeAccount();
    foreach (['teknisi_participants', 'zakat_academy_profiles', 'tanwir_members', 'ojol_members'] as $table) Schema::drop($table);
    $this->postJson('/api/v1/auth/login', ['code' => $user->code, 'password' => 'password-code-test'])->assertOk();
});

it('backfills existing users and all legacy codes without changing passwords or permissions', function () {
    $migration = require database_path('migrations/2026_10_29_000000_add_account_login_codes.php');
    $migration->down();
    $hash = Hash::make('password-code-test');
    foreach (['legacy', 'plain'] as $id) {
        DB::table('users')->insert(['id' => $id, 'name' => $id, 'email' => $id.'@example.test', 'password_hash' => $hash]);
    }
    DB::table('zakat_academy_profiles')->insert(['id' => 'legacy-academy', 'user_id' => 'legacy', 'nis' => 'PAZ007']);
    DB::table('tanwir_members')->insert(['id' => 'legacy-tanwir', 'user_id' => 'legacy', 'code' => 'PTQ007', 'role' => 'peserta']);
    $migration->up();
    expect(AccountCodes::find('paz007')->id)->toBe('legacy')->and(AccountCodes::find('ptq007')->id)->toBe('legacy');
    $code = DB::table('users')->where('id', 'plain')->value('code');
    expect($code)->toStartWith('SIP-')->and(DB::table('users')->where('id', 'plain')->value('password_hash'))->toBe($hash)
        ->and(DB::table('module_access')->count())->toBe(0);
    $migration->up();
    expect(DB::table('users')->where('id', 'plain')->value('code'))->toBe($code)->and(DB::table('user_login_codes')->count())->toBe(3);
});
