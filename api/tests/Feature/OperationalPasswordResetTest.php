<?php

use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function resetAccount(array $attributes = []): User
{
    $user = new User;
    $user->forceFill(array_replace(['name' => 'Petugas uji', 'password_hash' => Hash::make('original-password-123'), 'is_active' => true, 'is_superadmin' => false], $attributes))->save();
    return $user;
}

function resetAccess(User $user, string $module, string $role): void
{
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => $module, 'role' => $role]);
}

beforeEach(function () {
    foreach (['bantuan', 'teknisi'] as $slug) {
        DB::table('modules')->updateOrInsert(['slug' => $slug], ['id' => 'reset-'.$slug, 'name' => $slug, 'is_active' => true]);
    }
    $this->admin = resetAccount(['code' => 'AMSIP0980']);
    resetAccess($this->admin, 'reset-bantuan', 'admin');
    $this->target = resetAccount(['code' => 'SIP980']);
    resetAccess($this->target, 'reset-bantuan', 'verifier');
    $this->resetUrl = '/api/v1/core/module-accounts/'.$this->target->id.'/password-reset';
    $this->newPassword = ['password' => 'replacement-password-123', 'password_confirmation' => 'replacement-password-123'];
});

it('lets a module admin reset an operational password without the old password and revokes all target tokens', function () {
    $this->target->createToken('web');
    $this->target->createToken('mobile');
    Sanctum::actingAs($this->admin);
    $response = $this->postJson($this->resetUrl, $this->newPassword)->assertOk()->assertJsonPath('data.code', 'SIP980');
    expect(Hash::check($this->newPassword['password'], $this->target->fresh()->password_hash))->toBeTrue()
        ->and($this->target->tokens()->count())->toBe(0)
        ->and($response->headers->get('Cache-Control'))->toContain('no-store')
        ->and($response->getContent())->not->toContain($this->newPassword['password']);
    $audit = DB::table('access_logs')->value('message');
    expect($audit)->toContain('SIP980')->not->toContain($this->newPassword['password']);
    $this->getJson('/api/v1/core/module-accounts')->assertOk()->assertJsonPath('data.accounts.0.canResetPassword', true);
});

it('rejects weak or mismatched passwords without changing the hash or tokens', function (array $input) {
    Sanctum::actingAs($this->admin);
    $hash = $this->target->password_hash;
    $this->target->createToken('keep');
    $this->postJson($this->resetUrl, $input)->assertUnprocessable();
    expect($this->target->fresh()->password_hash)->toBe($hash)->and($this->target->tokens()->count())->toBe(1);
})->with([
    [['password' => 'short', 'password_confirmation' => 'short']],
    [['password' => 'replacement-password-123', 'password_confirmation' => 'mismatched-password']],
]);

it('denies operational accounts and unauthenticated callers', function () {
    $this->postJson($this->resetUrl, $this->newPassword)->assertUnauthorized();
    Sanctum::actingAs($this->target);
    $this->postJson('/api/v1/core/module-accounts/'.$this->admin->id.'/password-reset', $this->newPassword)->assertForbidden();
});

it('denies out-of-scope and shared-module targets to a module admin', function (bool $shared) {
    if (! $shared) DB::table('module_access')->where('user_id', $this->target->id)->delete();
    resetAccess($this->target, 'reset-teknisi', 'participant');
    Sanctum::actingAs($this->admin);
    $this->postJson($this->resetUrl, $this->newPassword)->assertForbidden();
    expect(Hash::check('original-password-123', $this->target->fresh()->password_hash))->toBeTrue();
    if ($shared) $this->getJson('/api/v1/core/module-accounts')->assertOk()->assertJsonPath('data.accounts.0.canResetPassword', false);
})->with([true, false]);

it('allows superadmin to reset a shared operational account', function () {
    resetAccess($this->target, 'reset-teknisi', 'participant');
    Sanctum::actingAs(resetAccount(['is_superadmin' => true]));
    $this->postJson($this->resetUrl, $this->newPassword)->assertOk();
});

it('does not allow resetting admin accounts or the current account with this endpoint', function () {
    $otherAdmin = resetAccount(['code' => 'AMSIP0981']);
    resetAccess($otherAdmin, 'reset-bantuan', 'admin');
    Sanctum::actingAs($this->admin);
    $this->postJson('/api/v1/core/module-accounts/'.$otherAdmin->id.'/password-reset', $this->newPassword)->assertForbidden();
    $this->postJson('/api/v1/core/module-accounts/'.$this->admin->id.'/password-reset', $this->newPassword)->assertForbidden();
    $super = resetAccount(['is_superadmin' => true]);
    Sanctum::actingAs($super);
    $this->postJson('/api/v1/core/module-accounts/'.$otherAdmin->id.'/password-reset', $this->newPassword)->assertForbidden();
    $this->postJson('/api/v1/core/module-accounts/'.$super->id.'/password-reset', $this->newPassword)->assertForbidden();
});
