<?php

use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Models\User;
use App\Modules\Core\Services\UserService;
use App\Modules\Core\Services\BackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function hierarchyAccount(bool $superadmin = false, array $modules = []): User
{
    return app(UserService::class)->create(['name' => 'Akun hierarki', 'password' => 'hierarchy-password', 'isSuperadmin' => $superadmin, 'moduleIds' => $modules]);
}

beforeEach(function () {
    foreach (['sip', 'lazsip', 'sarsip', 'payment', 'academy', 'teknisi', 'tanwir', 'ojol', 'bantuan'] as $slug) {
        DB::table('modules')->updateOrInsert(['slug' => $slug], ['id' => 'hierarchy-'.$slug, 'name' => $slug, 'is_active' => true]);
    }
});

it('has exactly one superadmin SASIP01 and refuses a second through the model or API', function () {
    $owner = hierarchyAccount(true);
    expect($owner->code)->toBe('SASIP01');
    expect(fn () => hierarchyAccount(true))->toThrow(ValidationException::class);
    Sanctum::actingAs($owner);
    $this->postJson('/api/v1/super/akun', ['name' => 'Superadmin kedua', 'password' => 'hierarchy-password', 'isSuperadmin' => true])->assertUnprocessable();
    $this->putJson('/api/v1/super/akun/'.$owner->id.'/status', ['isActive' => false])->assertUnprocessable();
    expect(User::where('is_superadmin', true)->count())->toBe(1)->and(AccountCodes::find('SASIP01')->id)->toBe($owner->id);
    expect(fn () => AccountCodes::register($owner->id, 'SASIP02'))->toThrow(ValidationException::class);
});

it('enforces the singleton even for direct database inserts with another code', function () {
    hierarchyAccount(true);
    expect(fn () => DB::transaction(fn () => DB::table('users')->insert(['id' => 'invalid-second', 'name' => 'Second', 'email' => 'second@example.test',
        'password_hash' => 'unused', 'code' => 'OTHER-CODE', 'is_superadmin' => true])))->toThrow(\Illuminate\Database\QueryException::class);
    expect(User::where('is_superadmin', true)->count())->toBe(1);
});

it('allocates increasing AMSIP admin codes and preserves them across edits', function () {
    $first = hierarchyAccount(false, ['hierarchy-sip']);
    $second = hierarchyAccount(false, ['hierarchy-lazsip']);
    expect($first->code)->toBe('AMSIP0001')->and($second->code)->toBe('AMSIP0002');
    app(UserService::class)->update($first->id, ['name' => 'Nama baru', 'email' => null]);
    expect($first->fresh()->code)->toBe('AMSIP0001');
});

it('changes an existing operational identity to AMSIP when the superadmin grants an admin role', function () {
    $person = new User;
    $person->forceFill(['name' => 'Operasional', 'password_hash' => Hash::make('hierarchy-password')])->save();
    $old = $person->code;
    app(UserService::class)->setAccess($person->id, [['moduleId' => 'hierarchy-sip', 'role' => 'admin']]);
    expect($person->fresh()->code)->toBe('AMSIP0001')->and(AccountCodes::find('AMSIP0001')->id)->toBe($person->id)
        ->and(AccountCodes::find($old))->toBeNull();
});

it('lets module admins create only operational roles within their assigned module', function (string $slug) {
    $admin = hierarchyAccount(false, ['hierarchy-'.$slug]);
    Sanctum::actingAs($admin);
    $index = $this->getJson('/api/v1/core/module-accounts')->assertOk()->json('data');
    expect(array_column($index['modules'], 'slug'))->toBe([$slug]);
    $input = ['moduleId' => 'hierarchy-'.$slug, 'role' => 'editor', 'name' => 'Editor uji', 'password' => 'hierarchy-password'];
    $created = $this->postJson('/api/v1/core/module-accounts', $input)->assertCreated()->json('data');
    expect(User::findOrFail($created['id'])->is_superadmin)->toBeFalse();
    expect(DB::table('module_access')->where('user_id', $created['id'])->pluck('module_id')->all())->toBe(['hierarchy-'.$slug]);
    $this->postJson('/api/v1/core/module-accounts', [...$input, 'moduleId' => 'hierarchy-academy'])->assertForbidden();
    $this->postJson('/api/v1/core/module-accounts', [...$input, 'role' => 'admin'])->assertUnprocessable();
    $this->postJson('/api/v1/core/module-accounts', [...$input, 'isSuperadmin' => true])->assertUnprocessable();
    $this->postJson('/api/v1/core/module-accounts', [...$input, 'moduleIds' => ['hierarchy-academy']])->assertUnprocessable();
    $this->postJson('/api/v1/super/akun', ['name' => 'Admin kedua', 'password' => 'hierarchy-password'])->assertForbidden();
})->with(['sip', 'lazsip', 'sarsip', 'payment']);

it('keeps specialized registration in its module and refuses generic profile-less accounts', function () {
    Sanctum::actingAs(hierarchyAccount(false, ['hierarchy-tanwir', 'hierarchy-ojol', 'hierarchy-bantuan']));
    $index = $this->getJson('/api/v1/core/module-accounts')->assertOk()->json('data.modules');
    foreach ($index as $module) expect($module['links'])->not->toBeEmpty();
    $this->postJson('/api/v1/core/module-accounts', ['moduleId' => 'hierarchy-bantuan', 'role' => 'verifier', 'name' => 'Verifikator', 'password' => 'hierarchy-password'])->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/staff', ['roles' => ['admin'], 'name' => 'Admin ilegal', 'password' => 'hierarchy-password', 'canBypass' => false])->assertUnprocessable();
});

it('prevents operational roles from entering account administration and excludes other modules accounts', function () {
    $admin = hierarchyAccount(false, ['hierarchy-sip']);
    $foreign = hierarchyAccount(false, ['hierarchy-lazsip']);
    $worker = new User;
    $worker->forceFill(['name' => 'Editor SIP', 'password_hash' => 'unused', 'is_active' => true])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $worker->id, 'module_id' => 'hierarchy-sip', 'role' => 'editor']);
    Sanctum::actingAs($worker);
    $this->getJson('/api/v1/core/module-accounts')->assertForbidden();
    $this->postJson('/api/v1/core/module-accounts', ['moduleId' => 'hierarchy-sip', 'role' => 'editor', 'name' => 'New', 'password' => 'hierarchy-password'])->assertForbidden();
    Sanctum::actingAs($admin);
    $data = $this->getJson('/api/v1/core/module-accounts')->assertOk()->json('data.accounts');
    expect(array_column($data, 'id'))->toBe([$worker->id])->not->toContain($foreign->id);
});

it('migrates the superadmin and admins without changing hashes tokens or grants', function () {
    $owner = hierarchyAccount(true);
    $admin = hierarchyAccount(false, ['hierarchy-sip']);
    $owner->createToken('migration-test');
    foreach ([$owner, $admin] as $i => $user) {
        DB::table('user_login_codes')->where('user_id', $user->id)->delete();
        DB::table('users')->where('id', $user->id)->update(['code' => 'SIP-OLD'.$i]);
        DB::table('user_login_codes')->insert(['user_id' => $user->id, 'code' => 'SIP-OLD'.$i]);
    }
    $hash = $admin->password_hash;
    $migration = require database_path('migrations/2026_10_29_010000_enforce_admin_account_codes.php');
    $migration->up();
    expect($owner->fresh()->code)->toBe('SASIP01')->and($admin->fresh()->code)->toMatch('/^AMSIP\d{4,}$/')
        ->and($admin->fresh()->password_hash)->toBe($hash)->and($owner->tokens()->count())->toBe(1)
        ->and(AccountCodes::find('SIP-OLD0'))->toBeNull()->and(AccountCodes::find('SIP-OLD1'))->toBeNull()
        ->and(DB::table('module_access')->where('user_id', $admin->id)->count())->toBe(1);
    $code = $admin->fresh()->code;
    $migration->up();
    expect($admin->fresh()->code)->toBe($code);
});

it('backs up writable fields while leaving generated singleton fields to the database', function () {
    expect(BackupService::writableColumns([
        ['Field' => 'id', 'Extra' => ''], ['Field' => 'created_at', 'Extra' => 'DEFAULT_GENERATED'],
        ['Field' => 'superadmin_slot', 'Extra' => 'VIRTUAL GENERATED'], ['Field' => 'computed', 'Extra' => 'STORED GENERATED'],
    ]))->toBe(['id', 'created_at']);
});

it('renames legacy ASIP codes to AMSIP while retaining their number and the single SASIP01', function () {
    $owner = hierarchyAccount(true);
    $admin = hierarchyAccount(false, ['hierarchy-sip']);
    DB::table('user_login_codes')->where('user_id', $admin->id)->delete();
    DB::table('users')->where('id', $admin->id)->update(['code' => 'ASIP0025']);
    DB::table('user_login_codes')->insert(['code' => 'ASIP0025', 'user_id' => $admin->id]);
    $hash = $admin->password_hash;
    $migration = require database_path('migrations/2026_10_29_020000_rename_admin_login_codes_to_amsip.php');
    $migration->up();
    expect($admin->fresh()->code)->toBe('AMSIP0025')->and(AccountCodes::find('ASIP0025'))->toBeNull()
        ->and(AccountCodes::find('AMSIP0025')->id)->toBe($admin->id)->and($admin->fresh()->password_hash)->toBe($hash)
        ->and($owner->fresh()->code)->toBe('SASIP01');
    $migration->up();
    expect(hierarchyAccount()->code)->toBe('AMSIP0026');
});
