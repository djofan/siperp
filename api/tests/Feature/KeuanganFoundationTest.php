<?php

use App\Modules\Core\Models\User;
use App\Modules\Core\Services\ManagedAccounts;
use App\Modules\Core\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function keuanganActor(string $role = 'operator', bool $super = false): User
{
    $user = app(UserService::class)->create(['name' => 'Finance test actor', 'password' => 'test-only-password', 'isSuperadmin' => $super]);
    if (! $super) {
        DB::table('module_access')->insert(['id' => 'access-'.$user->id, 'user_id' => $user->id, 'module_id' => 'module-keuangan', 'role' => $role]);
    }

    return $user;
}

it('registers an inactive module and empty isolated schema without granting accounts', function () {
    expect(DB::table('modules')->where('slug', 'keuangan')->value('is_active'))->toBeFalsy();
    expect(DB::table('module_access')->where('module_id', 'module-keuangan')->count())->toBe(0);
    foreach (['sources', 'categories', 'expenses', 'approval_rules', 'rule_approvers', 'approvals', 'approval_events'] as $name) {
        expect(Schema::hasTable('keuangan_'.$name))->toBeTrue();
        expect(DB::table('keuangan_'.$name)->count())->toBe(0);
    }
    expect(DB::table('core_expenses')->count())->toBe(0);
});

it('requires authentication and rejects missing access inactive users and unknown roles', function () {
    $this->getJson('/api/v1/keuangan/overview')->assertUnauthorized();
    $known = keuanganActor('operator');
    Sanctum::actingAs($known);
    $this->getJson('/api/v1/keuangan/overview')->assertForbidden();
    $actor = keuanganActor('unknown');
    Sanctum::actingAs($actor);
    $this->getJson('/api/v1/keuangan/overview')->assertForbidden();
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => true]);
    $this->getJson('/api/v1/keuangan/overview')->assertForbidden();
    DB::table('module_access')->where('user_id', $actor->id)->delete();
    $this->getJson('/api/v1/keuangan/overview')->assertForbidden();
    $actor->forceFill(['is_active' => false])->save();
    Sanctum::actingAs($actor);
    $this->getJson('/api/v1/keuangan/overview')->assertUnauthorized();
});

it('limits overview metadata according to Core role', function (string $role, bool $masters, bool $approvals, bool $manage) {
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => true]);
    $actor = keuanganActor($role);
    Sanctum::actingAs($actor);
    $this->getJson('/api/v1/keuangan/overview')->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.readOnly', false)->assertJsonPath('data.role', $role)
        ->assertJsonPath('data.permissions.readMasters', $masters)
        ->assertJsonPath('data.permissions.manageAccounts', $manage)
        ->assertJsonPath('data.counts.sources', $masters ? 0 : null)
        ->assertJsonPath('data.counts.myPendingApprovals', $approvals ? 0 : null);
    $schema = json_decode(file_get_contents(base_path('docs/openapi.json')), true)['paths']['/api/v1/keuangan/overview']['get']['responses']['200']['content']['application/json']['schema']['properties']['data'];
    $data = $this->getJson('/api/v1/keuangan/overview')->assertOk()->json('data');
    expect(array_keys($data))->toEqualCanonicalizing($schema['required']);
    foreach (['counts', 'permissions'] as $group) {
        expect(array_keys($data[$group]))->toEqualCanonicalizing($schema['properties'][$group]['required']);
    }
    expect($schema['properties']['role']['enum'])->toContain($data['role']);
    $managed = app(ManagedAccounts::class)->modules($actor);
    expect(in_array('keuangan', array_column($managed, 'slug'), true))->toBe($manage);
})->with([
    ['admin', true, true, true], ['finance_admin', true, true, false],
    ['treasurer', true, true, false], ['approver', false, true, false], ['operator', false, false, false],
]);

it('allows Core superadmin to preview while inactive without promoting module administrators', function () {
    Sanctum::actingAs(keuanganActor('admin', true));
    $this->getJson('/api/v1/keuangan/overview')->assertOk()->assertJsonPath('data.role', 'superadmin');
    expect(DB::table('modules')->where('slug', 'keuangan')->value('is_active'))->toBeFalsy();
});

it('counts only assigned waiting approvals and does not disclose private rows or change Core finance', function () {
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => true]);
    $actor = keuanganActor('approver');
    $other = keuanganActor('approver');
    DB::table('keuangan_sources')->insert(['id' => 'source', 'name' => 'Private source']);
    DB::table('keuangan_categories')->insert(['id' => 'category', 'name' => 'Private category']);
    DB::table('keuangan_expenses')->insert(['id' => 'expense', 'source_id' => 'source', 'category_id' => 'category', 'recipient' => 'Private recipient', 'description' => 'Private note', 'amount' => '9007199254740993', 'origin' => 'legacy']);
    foreach ([$actor, $other] as $user) {
        DB::table('keuangan_approvals')->insert(['id' => 'approval-'.$user->id, 'expense_id' => 'expense', 'assigned_user_id' => $user->id]);
    }
    Sanctum::actingAs($actor);
    $response = $this->getJson('/api/v1/keuangan/overview')->assertOk()
        ->assertJsonPath('data.counts.myPendingApprovals', 1)->assertJsonPath('data.counts.expenses', 1);
    foreach (['Private recipient', 'Private note', $other->id, '9007199254740993'] as $secret) {
        expect($response->getContent())->not->toContain($secret);
    }
    expect((string) DB::table('keuangan_expenses')->value('amount'))->toBe('9007199254740993');
    expect(DB::table('core_expenses')->count())->toBe(0);
    expect(DB::table('keuangan_approvals')->where('decision', 'waiting')->count())->toBe(2);
    $this->postJson('/api/v1/keuangan/expenses', [])->assertForbidden();
});
