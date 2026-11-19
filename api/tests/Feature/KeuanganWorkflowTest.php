<?php

use App\Modules\Core\Models\User;
use App\Modules\Core\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function financeActor(string $role): User
{
    $u = app(UserService::class)->create(['name' => 'Finance '.$role, 'password' => 'only-test-password']);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $u->id, 'module_id' => 'module-keuangan', 'role' => $role]);

    return $u;
}
function financeKey(array $data): array
{
    return ['requestId' => (string) Str::uuid(), ...$data];
}

beforeEach(function () {
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => true]);
    $this->manager = financeActor('finance_admin');
    $this->operator = financeActor('operator');
    $this->first = financeActor('treasurer');
    $this->second = financeActor('treasurer');
    Sanctum::actingAs($this->manager);
    $this->source = $this->postJson('/api/v1/keuangan/masters/sources', financeKey(['name' => 'Dana QA']))->assertCreated()->json('data.id');
    $this->category = $this->postJson('/api/v1/keuangan/masters/categories', financeKey(['name' => 'Kategori QA']))->assertCreated()->json('data.id');
    $this->rule = ['minAmount' => '1', 'maxAmount' => '1000000', 'approverIds' => [$this->first->id, $this->second->id], 'active' => true];
    $this->ruleId = $this->postJson('/api/v1/keuangan/approval-rules', financeKey($this->rule))->assertCreated()->json('data.id');
    $this->expense = ['sourceId' => $this->source, 'categoryId' => $this->category, 'amount' => '500000', 'recipient' => 'Penerima QA', 'description' => 'Pengeluaran QA'];
});

it('creates exact rupiah expenses once and snapshots parallel approvers without posting payments', function () {
    Sanctum::actingAs($this->operator);
    $payload = financeKey($this->expense);
    $id = $this->postJson('/api/v1/keuangan/expenses', $payload)->assertCreated()->json('data.id');
    $this->postJson('/api/v1/keuangan/expenses', $payload)->assertCreated()->assertJsonPath('data.id', $id);
    $this->postJson('/api/v1/keuangan/expenses', [...$payload, 'amount' => '600000'])->assertConflict();
    expect(DB::table('keuangan_expenses')->count())->toBe(1);
    expect(DB::table('keuangan_approvals')->where('expense_id', $id)->count())->toBe(2);
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('data.amount', '500000')->assertJsonPath('data.status', 'waiting')->assertJsonCount(0, 'data.approvals')->assertJsonCount(0, 'data.decisionHistory');
    expect(DB::table('core_expenses')->count())->toBe(0);
    $snapshot = json_decode(DB::table('keuangan_approvals')->value('rule_snapshot'), true);
    expect($snapshot['minAmount'])->toBe('1');
    expect($snapshot['approvers'])->toHaveCount(2);
});

it('closes other tasks on rejection and reopens them only after an audited rejection revision', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertCreated()->json('data.id');
    $a = DB::table('keuangan_approvals')->where('expense_id', $id)->where('assigned_user_id', $this->first->id)->first();
    $b = DB::table('keuangan_approvals')->where('expense_id', $id)->where('assigned_user_id', $this->second->id)->first();
    Sanctum::actingAs($this->first);
    $this->postJson('/api/v1/keuangan/approvals/'.$b->id.'/decisions', financeKey(['version' => 1, 'decision' => 'approved']))->assertNotFound();
    $this->getJson('/api/v1/keuangan/approvals/'.$b->id)->assertNotFound();
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', financeKey(['version' => 1, 'decision' => 'rejected']))->assertUnprocessable();
    $reject = financeKey(['version' => 1, 'decision' => 'rejected', 'note' => 'Dokumen perlu dilengkapi']);
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', $reject)->assertOk();
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', $reject)->assertOk();
    expect(DB::table('keuangan_approval_events')->where('action', 'decided')->count())->toBe(1);
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'rejected');
    Sanctum::actingAs($this->second);
    $this->getJson('/api/v1/keuangan/overview')->assertJsonPath('data.counts.myPendingApprovals', 0);
    $this->postJson('/api/v1/keuangan/approvals/'.$b->id.'/decisions', financeKey(['version' => 2, 'decision' => 'approved']))->assertConflict();
    Sanctum::actingAs($this->first);
    $url = '/api/v1/keuangan/approvals/'.$a->id.'/decisions';
    $this->postJson($url, financeKey(['version' => 2, 'decision' => 'approved']))->assertUnprocessable();
    $this->postJson($url, financeKey(['version' => 2, 'decision' => 'approved', 'reason' => 'Dokumen telah dilengkapi']))->assertOk();
    Sanctum::actingAs($this->second);
    $this->getJson('/api/v1/keuangan/overview')->assertJsonPath('data.counts.myPendingApprovals', 1);
    $this->postJson('/api/v1/keuangan/approvals/'.$b->id.'/decisions', financeKey(['version' => 2, 'decision' => 'approved']))->assertConflict();
    $this->postJson('/api/v1/keuangan/approvals/'.$b->id.'/decisions', financeKey(['version' => 3, 'decision' => 'approved']))->assertOk();
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'approved');
    expect(DB::table('keuangan_approval_events')->where('action', 'decision_revised')->count())->toBe(1);
    Sanctum::actingAs($this->manager);
    $events = $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertOk()->json('data.decisionHistory');
    expect(collect($events)->where('action', 'decision_revised')->first()['reason'])->toBe('Dokumen telah dilengkapi');
    expect(DB::table('core_expenses')->count())->toBe(0);
});

it('revises expenses with a new approval round and retains all previous decisions', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertCreated()->json('data.id');
    $a = DB::table('keuangan_approvals')->where('expense_id', $id)->where('assigned_user_id', $this->first->id)->first();
    Sanctum::actingAs($this->first);
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', financeKey(['version' => 1, 'decision' => 'approved']))->assertOk();
    Sanctum::actingAs($this->operator);
    $input = financeKey([...$this->expense, 'amount' => '700000', 'version' => 1, 'reason' => 'Perbaikan rincian anggaran']);
    $this->putJson('/api/v1/keuangan/expenses/'.$id, $input)->assertConflict();
    $this->putJson('/api/v1/keuangan/expenses/'.$id, [...$input, 'version' => 2])->assertOk()->assertJsonPath('data.revision', 2);
    expect(DB::table('keuangan_approvals')->where('expense_id', $id)->count())->toBe(4);
    expect(DB::table('keuangan_approvals')->where('id', $a->id)->value('decision'))->toBe('approved');
    Sanctum::actingAs($this->first);
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', financeKey(['version' => 3, 'decision' => 'rejected', 'note' => 'Bukan revisi berjalan', 'reason' => 'Memerlukan koreksi lagi']))->assertConflict();
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.revision', 2)->assertJsonPath('data.status', 'waiting')->assertJsonCount(2, 'data.history');
});

it('rejects overlapping rules and forbidden roles and preserves prior snapshots on rule changes', function () {
    $this->postJson('/api/v1/keuangan/approval-rules', financeKey([...$this->rule, 'minAmount' => '100', 'maxAmount' => '200']))->assertUnprocessable();
    $this->postJson('/api/v1/keuangan/approval-rules', financeKey([...$this->rule, 'minAmount' => '1000000', 'maxAmount' => '2000000']))->assertUnprocessable();
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertCreated()->json('data.id');
    $snapshot = DB::table('keuangan_approvals')->value('rule_snapshot');
    $this->putJson('/api/v1/keuangan/approval-rules/'.$this->ruleId, financeKey([...$this->rule, 'approverIds' => [$this->first->id], 'version' => 1]))->assertOk();
    expect(DB::table('keuangan_approvals')->value('rule_snapshot'))->toBe($snapshot);
    Sanctum::actingAs($this->operator);
    $this->getJson('/api/v1/keuangan/settings')->assertForbidden();
    $this->postJson('/api/v1/keuangan/masters/sources', financeKey(['name' => 'Not allowed']))->assertForbidden();
    $this->getJson('/api/v1/keuangan/expense-options')->assertOk();
    $this->getJson('/api/v1/keuangan/approvals')->assertForbidden();
    Sanctum::actingAs($this->second);
    $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertForbidden();
    $this->putJson('/api/v1/keuangan/expenses/'.$id, financeKey([...$this->expense, 'version' => 1, 'reason' => 'Tidak punya hak ubah']))->assertForbidden();
});

it('keeps unmatched expenses explicitly unassigned and validates money and inactive approvers atomically', function () {
    foreach (['1.5', '-10', '0', '1e5', '9000000000000001'] as $amount) {
        $this->postJson('/api/v1/keuangan/expenses', financeKey([...$this->expense, 'amount' => $amount]))->assertUnprocessable();
    }
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey([...$this->expense, 'amount' => '1000001']))->assertCreated()->json('data.id');
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'unassigned');
    $this->first->forceFill(['is_active' => false])->save();
    $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertUnprocessable();
    expect(DB::table('keuangan_expenses')->count())->toBe(1);
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => false]);
    $this->getJson('/api/v1/keuangan/expenses')->assertForbidden();
});

it('does not let an already answered approver revise while another rejection closes the round', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertCreated()->json('data.id');
    $a = DB::table('keuangan_approvals')->where('expense_id', $id)->where('assigned_user_id', $this->first->id)->first();
    $b = DB::table('keuangan_approvals')->where('expense_id', $id)->where('assigned_user_id', $this->second->id)->first();
    Sanctum::actingAs($this->first);
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', financeKey(['version' => 1, 'decision' => 'approved']))->assertOk();
    Sanctum::actingAs($this->second);
    $this->postJson('/api/v1/keuangan/approvals/'.$b->id.'/decisions', financeKey(['version' => 1, 'decision' => 'rejected', 'note' => 'Perlu perbaikan dokumen']))->assertOk();
    Sanctum::actingAs($this->first);
    $this->getJson('/api/v1/keuangan/approvals/'.$a->id)->assertJsonPath('data.canDecide', false);
    $this->postJson('/api/v1/keuangan/approvals/'.$a->id.'/decisions', financeKey(['version' => 2, 'decision' => 'approved', 'reason' => 'Mencoba perubahan kembali']))->assertConflict();
});

it('honors inclusive rule bounds zero minimum and exact large rupiah reads', function () {
    $this->putJson('/api/v1/keuangan/approval-rules/'.$this->ruleId, financeKey([...$this->rule, 'version' => 1, 'minAmount' => '0']))->assertOk();
    foreach (['1', '1000000'] as $amount) {
        $id = $this->postJson('/api/v1/keuangan/expenses', financeKey([...$this->expense, 'amount' => $amount]))->assertCreated()->json('data.id');
        $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.status', 'waiting');
    }
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey([...$this->expense, 'amount' => '9000000000000000']))->assertCreated()->json('data.id');
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.amount', '9000000000000000');
    DB::table('keuangan_expenses')->where('id', $id)->update(['amount' => '9007199254740993', 'origin' => 'legacy']);
    $this->getJson('/api/v1/keuangan/expenses/'.$id)->assertJsonPath('data.amount', '9007199254740993');
});

it('blocks writes for inactive modules including superadmin previews and current revoked memberships', function () {
    $super = app(UserService::class)->create(['name' => 'Super QA', 'password' => 'only-test-password', 'isSuperadmin' => true]);
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => false]);
    Sanctum::actingAs($super);
    $this->getJson('/api/v1/keuangan/overview')->assertOk()->assertJsonPath('data.readOnly', true);
    $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertForbidden();
    DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => true]);
    Sanctum::actingAs($this->operator);
    DB::table('module_access')->where('user_id', $this->operator->id)->delete();
    $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertForbidden();
    expect(DB::table('keuangan_expenses')->count())->toBe(0);
});

it('rolls back a failed expense revision including closure events and permits retry after configuration is fixed', function () {
    $id = $this->postJson('/api/v1/keuangan/expenses', financeKey($this->expense))->assertCreated()->json('data.id');
    $events = DB::table('keuangan_approval_events')->count();
    $this->first->forceFill(['is_active' => false])->save();
    $input = financeKey([...$this->expense, 'version' => 1, 'amount' => '600000', 'reason' => 'Penyesuaian anggaran QA']);
    $this->putJson('/api/v1/keuangan/expenses/'.$id, $input)->assertUnprocessable();
    expect(DB::table('keuangan_expenses')->where('id', $id)->value('revision'))->toBe(1);
    expect(DB::table('keuangan_approvals')->whereNotNull('cancelled_at')->count())->toBe(0);
    expect(DB::table('keuangan_approval_events')->count())->toBe($events);
    expect(DB::table('keuangan_requests')->where('request_id', $input['requestId'])->exists())->toBeFalse();
    $this->first->forceFill(['is_active' => true])->save();
    $this->putJson('/api/v1/keuangan/expenses/'.$id, $input)->assertOk()->assertJsonPath('data.revision', 2);
});

it('paginates and searches only financial module rows with explicit payloads', function () {
    for ($i = 0; $i < 27; $i++) {
        DB::table('keuangan_expenses')->insert(['id' => 'list-'.$i, 'recipient' => 'Penerima '.$i, 'source_id' => $this->source, 'category_id' => $this->category, 'amount' => '10000', 'description' => 'Baris pencarian QA', 'created_at' => now()->subMinutes($i)]);
    }
    $this->getJson('/api/v1/keuangan/expenses')->assertOk()->assertJsonPath('data.total', 27)->assertJsonCount(25, 'data.items');
    $this->getJson('/api/v1/keuangan/expenses?page=2')->assertJsonCount(2, 'data.items');
    $this->getJson('/api/v1/keuangan/expenses?search=Penerima%2026')->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.recipient', 'Penerima 26')->assertJsonMissingPath('data.items.0.created_by');
    $this->getJson('/api/v1/keuangan/expenses?page=0')->assertUnprocessable();
});
