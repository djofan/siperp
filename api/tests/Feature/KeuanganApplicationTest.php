<?php

use App\Modules\Core\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function applicationActor(string $role)
{
    $user = app(UserService::class)->create(['name' => 'Application '.$role, 'password' => 'test-only-password']);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => 'module-keuangan', 'role' => $role]);

    return $user;
}

beforeEach(function () {
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => true]);
    $this->admin = applicationActor('finance_admin');
    $this->treasury = applicationActor('treasurer');
    $this->operator = applicationActor('operator');
    $this->retired = applicationActor('approver');
    Sanctum::actingAs($this->admin);
    $this->program = $this->postJson('/api/v1/keuangan/masters/programs', ['requestId' => (string) Str::uuid(), 'name' => 'Pendidikan QA'])->assertCreated()->json('data.id');
    $this->input = ['requestId' => (string) Str::uuid(), 'sourceId' => DB::table('keuangan_sources')->where('name', 'Kas Infaq')->value('id'), 'categoryId' => DB::table('keuangan_categories')->where('name', 'Kegiatan Sosial')->value('id'), 'programId' => $this->program, 'requestedOn' => '2026-11-19', 'treasurerId' => $this->treasury->id, 'recipient' => 'Penerima QA', 'recipientIdentity' => 'Identitas privat QA', 'description' => 'Kegiatan pendidikan untuk peserta QA', 'amount' => '9000000000000000'];
});

it('provides fixed category fund choices editable programs and only active treasury choices', function () {
    $options = $this->getJson('/api/v1/keuangan/expense-options')->assertOk()->json('data');
    expect(array_column($options['sources'], 'name'))->toEqualCanonicalizing(['Kas Infaq', 'Kas Amil', 'Kas Riba']);
    expect(array_column($options['categories'], 'name'))->toEqualCanonicalizing(['Cash Advance', 'Kegiatan Sosial', 'Operasional', 'Lain-lain']);
    expect(array_column($options['treasurers'], 'id'))->toBe([$this->treasury->id]);
    expect(array_column($options['programs'], 'name'))->toContain('Pendidikan QA');
    $this->postJson('/api/v1/keuangan/masters/programs', ['requestId' => (string) Str::uuid(), 'name' => ' pendidikan qa '])->assertUnprocessable();
    Sanctum::actingAs($this->treasury);
    $this->postJson('/api/v1/keuangan/masters/programs', ['requestId' => (string) Str::uuid(), 'name' => 'Forbidden'])->assertForbidden();
});

it('assigns the selected treasury independently of nominal rules and retains exact application fields', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', $this->input)->assertCreated()->json('data.id');
    $this->postJson('/api/v1/keuangan/expenses', $this->input)->assertCreated()->assertJsonPath('data.id', $id);
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertOk()->assertJsonPath('data.requestedOn', '2026-11-19')->assertJsonPath('data.program', 'Pendidikan QA')->assertJsonPath('data.amount', '9000000000000000')->assertJsonPath('data.recipientIdentity', 'Identitas privat QA')->assertJsonCount(1, 'data.signoffs');
    expect(DB::table('keuangan_approvals')->where('expense_id', $id)->pluck('assigned_user_id')->all())->toBe([$this->treasury->id]);
    $approval = DB::table('keuangan_approvals')->where('expense_id', $id)->first();
    $decision = ['requestId' => (string) Str::uuid(), 'version' => 1, 'decision' => 'approved'];
    $this->postJson('/api/v1/keuangan/approvals/'.$approval->id.'/decisions', $decision)->assertForbidden();
    Sanctum::actingAs($this->treasury);
    $this->postJson('/api/v1/keuangan/approvals/'.$approval->id.'/decisions', $decision)->assertOk();
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'approved');
    Sanctum::actingAs($this->operator);
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertOk()->assertJsonPath('data.signoffs.0.decision', 'approved')->assertJsonCount(0, 'data.history')->assertJsonCount(0, 'data.approvals');
    expect(DB::table('core_expenses')->count())->toBe(0);
});

it('rejects invalid dates missing application fields inactive treasury and forged finance admin approvals atomically', function () {
    foreach ([['requestedOn' => '2026-02-30'], ['requestedOn' => null], ['programId' => 'missing'], ['treasurerId' => $this->admin->id], ['treasurerId' => $this->retired->id]] as $override) {
        $this->postJson('/api/v1/keuangan/expenses', [...$this->input, ...$override, 'requestId' => (string) Str::uuid()])->assertUnprocessable();
    }
    $this->treasury->forceFill(['is_active' => false])->save();
    $this->postJson('/api/v1/keuangan/expenses', $this->input)->assertUnprocessable();
    expect(DB::table('keuangan_expenses')->count())->toBe(0);
    expect(DB::table('keuangan_approvals')->count())->toBe(0);
    Sanctum::actingAs($this->retired);
    $this->getJson('/api/v1/keuangan/overview')->assertForbidden();
});

it('preserves previous approval and identity history when an application is revised', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', $this->input)->assertCreated()->json('data.id');
    $old = DB::table('keuangan_approvals')->where('expense_id', $id)->first();
    $this->putJson('/api/v1/keuangan/expenses/'.$id, [...$this->input, 'requestId' => (string) Str::uuid(), 'recipientIdentity' => 'Identitas revisi', 'amount' => '250000', 'version' => 1, 'reason' => 'Rincian penerima diperbarui'])->assertOk()->assertJsonPath('data.revision', 2);
    expect(DB::table('keuangan_approvals')->where('id', $old->id)->value('cancel_reason'))->toBe('revised');
    expect(DB::table('keuangan_expense_events')->where('expense_id', $id)->count())->toBe(2);
    $event = json_decode(DB::table('keuangan_expense_events')->where('expense_id', $id)->where('action', 'revised')->value('changes'), true);
    expect($event['before']['recipientIdentity'])->toBe('Identitas privat QA')->and($event['after']['recipientIdentity'])->toBe('Identitas revisi');
    $this->putJson('/api/v1/keuangan/expenses/'.$id, [...$this->input, 'requestId' => (string) Str::uuid(), 'programId' => null, 'requestedOn' => null, 'treasurerId' => null, 'version' => 2, 'reason' => 'Mencoba menghilangkan approver'])->assertUnprocessable();
    expect(DB::table('keuangan_expenses')->where('id', $id)->value('revision'))->toBe(2);
});

it('maps legacy program labels without replacing the original category amount dates or audit', function () {
    DB::table('keuangan_categories')->insert(['id' => 'old-program', 'name' => 'Program lama QA']);
    DB::table('keuangan_expenses')->insert(['id' => 'old', 'source_id' => $this->input['sourceId'], 'category_id' => 'old-program', 'recipient' => 'QA lama', 'description' => 'Arsip QA', 'amount' => '123456', 'origin' => 'legacy', 'created_at' => '2020-01-01 00:00:00']);
    $migration = require database_path('migrations/2026_11_19_000001_add_keuangan_application_fields.php');
    $migration->importLegacyPrograms();
    $expense = DB::table('keuangan_expenses')->where('id', 'old')->first();
    expect($expense->category_id)->toBe('old-program')->and((string) $expense->amount)->toBe('123456')->and($expense->requested_on)->toBeNull()->and($expense->created_at)->toBe('2020-01-01 00:00:00');
    expect(DB::table('keuangan_programs')->where('id', $expense->program_id)->value('name'))->toBe('Program lama QA');
    expect(DB::table('keuangan_expense_events')->count())->toBe(0);
});

it('retires chair access while preserving financial history and unrelated module access', function () {
    $shared = applicationActor('approver');
    DB::table('modules')->insert(['id' => 'shared-qa', 'slug' => 'shared-qa', 'name' => 'Other module QA', 'is_active' => true]);
    DB::table('module_access')->insert(['id' => 'shared-access', 'user_id' => $shared->id, 'module_id' => 'shared-qa', 'role' => 'admin']);
    $id = $this->postJson('/api/v1/keuangan/expenses', $this->input)->assertCreated()->json('data.id');
    DB::table('keuangan_approvals')->insert(['id' => 'chair-old', 'expense_id' => $id, 'assigned_user_id' => $this->retired->id, 'decision' => 'approved', 'revision' => 1]);
    DB::table('keuangan_approvals')->insert(['id' => 'chair-waiting', 'expense_id' => $id, 'assigned_user_id' => $shared->id, 'decision' => 'waiting', 'revision' => 1]);
    $migration = require database_path('migrations/2026_11_19_000002_retire_keuangan_chair_access.php');
    $migration->up();
    expect(DB::table('module_access')->where('role', 'approver')->where('module_id', 'module-keuangan')->count())->toBe(0);
    expect($this->retired->fresh()->is_active)->toBeFalse()->and($shared->fresh()->is_active)->toBeTrue();
    expect(DB::table('keuangan_approvals')->where('id', 'chair-old')->value('decision'))->toBe('approved');
    expect(DB::table('keuangan_expenses')->where('id', $id)->exists())->toBeTrue();
    expect(DB::table('module_access')->where('id', 'shared-access')->exists())->toBeTrue();
    expect(DB::table('keuangan_approvals')->where('id', 'chair-waiting')->value('cancel_reason'))->toBe('role_retired');
    expect(DB::table('keuangan_approval_events')->where('approval_id', 'chair-waiting')->where('action', 'closed')->count())->toBe(1);
    $treasuryApproval = DB::table('keuangan_approvals')->where('expense_id', $id)->where('assigned_user_id', $this->treasury->id)->first();
    Sanctum::actingAs($this->treasury);
    $this->postJson('/api/v1/keuangan/approvals/'.$treasuryApproval->id.'/decisions', ['requestId' => (string) Str::uuid(), 'version' => 1, 'decision' => 'approved'])->assertOk();
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'approved');
});

it('never lets treasury approve its own historical application and permits an unspecified recipient', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', [...$this->input, 'recipient' => null, 'recipientIdentity' => null])->assertCreated()->json('data.id');
    expect(DB::table('keuangan_expenses')->where('id', $id)->value('recipient'))->toBe('');
    DB::table('keuangan_expenses')->where('id', $id)->update(['created_by' => $this->treasury->id]);
    $approval = DB::table('keuangan_approvals')->where('expense_id', $id)->first();
    Sanctum::actingAs($this->treasury);
    $this->getJson('/api/v1/keuangan/approvals/'.$approval->id)->assertOk()->assertJsonPath('data.canDecide', false);
    $this->postJson('/api/v1/keuangan/approvals/'.$approval->id.'/decisions', ['requestId' => (string) Str::uuid(), 'version' => 1, 'decision' => 'approved'])->assertForbidden();
    expect(DB::table('keuangan_approvals')->where('id', $approval->id)->value('decision'))->toBe('waiting');
    expect(DB::table('keuangan_approval_events')->where('approval_id', $approval->id)->where('action', 'decided')->count())->toBe(0);
});

it('sends an unassigned existing expense to treasury once without changing its financial facts', function () {
    $legacy = array_diff_key($this->input, array_flip(['programId', 'requestedOn', 'treasurerId', 'recipientIdentity']));
    $legacy['amount'] = '4000000';
    $id = $this->postJson('/api/v1/keuangan/expenses', $legacy)->assertCreated()->json('data.id');
    $before = (array) DB::table('keuangan_expenses')->where('id', $id)->first();
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'unassigned');
    Sanctum::actingAs($this->treasury);
    $this->getJson('/api/v1/keuangan/approvals')->assertJsonPath('data.total', 0);
    Sanctum::actingAs($this->admin);
    $input = ['requestId' => (string) Str::uuid(), 'version' => 1, 'treasurerId' => $this->treasury->id, 'reason' => 'Pengajuan awal kepada Bendahara SIP'];
    $url = '/api/v1/keuangan/expenses/'.$id.'/approval-requests';
    $this->postJson($url, $input)->assertOk()->assertJsonPath('data.revision', 2);
    $this->postJson($url, $input)->assertOk()->assertJsonPath('data.revision', 2);
    $after = (array) DB::table('keuangan_expenses')->where('id', $id)->first();
    foreach (['amount', 'recipient', 'source_id', 'category_id', 'description', 'created_at', 'created_by', 'origin', 'program_id', 'requested_on', 'recipient_identity'] as $field) {
        expect($after[$field])->toBe($before[$field]);
    }
    expect(DB::table('keuangan_approvals')->where('expense_id', $id)->count())->toBe(1);
    expect(DB::table('keuangan_expense_events')->where('expense_id', $id)->where('action', 'approval_requested')->count())->toBe(1);
    $this->postJson($url, [...$input, 'requestId' => (string) Str::uuid()])->assertConflict();
    $this->postJson($url, [...$input, 'requestId' => (string) Str::uuid(), 'version' => 2])->assertConflict();
    Sanctum::actingAs($this->treasury);
    $this->getJson('/api/v1/keuangan/approvals')->assertOk()->assertJsonCount(1, 'data.items')->assertJsonPath('data.items.0.decision', 'waiting')->assertJsonPath('data.items.0.canDecide', true);
    $approval = DB::table('keuangan_approvals')->where('expense_id', $id)->first();
    $this->postJson('/api/v1/keuangan/approvals/'.$approval->id.'/decisions', ['requestId' => (string) Str::uuid(), 'version' => 1, 'decision' => 'approved'])->assertOk();
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'approved')->assertJsonPath('data.signoffs.0.decision', 'approved');
});

it('blocks assigning decided expenses or assigning to an ineligible account without partial writes', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', $this->input)->assertCreated()->json('data.id');
    $url = '/api/v1/keuangan/expenses/'.$id.'/approval-requests';
    $input = ['requestId' => (string) Str::uuid(), 'version' => 1, 'treasurerId' => $this->treasury->id, 'reason' => 'Pengajuan kepada Bendahara SIP'];
    $this->postJson($url, $input)->assertConflict();
    $legacy = array_diff_key($this->input, array_flip(['programId', 'requestedOn', 'treasurerId']));
    $legacy['requestId'] = (string) Str::uuid();
    $old = $this->postJson('/api/v1/keuangan/expenses', $legacy)->assertCreated()->json('data.id');
    foreach ([$this->admin->id, $this->retired->id, 'missing'] as $bad) {
        $this->postJson('/api/v1/keuangan/expenses/'.$old.'/approval-requests', [...$input, 'requestId' => (string) Str::uuid(), 'treasurerId' => $bad])->assertUnprocessable();
    }
    expect(DB::table('keuangan_expenses')->where('id', $old)->value('revision'))->toBe(1);
    expect(DB::table('keuangan_approvals')->where('expense_id', $old)->count())->toBe(0);
    Sanctum::actingAs($this->treasury);
    $this->postJson('/api/v1/keuangan/expenses/'.$old.'/approval-requests', $input)->assertForbidden();
});
