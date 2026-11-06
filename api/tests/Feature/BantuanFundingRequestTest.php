<?php

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Models\FundingRequestItem;
use App\Modules\Bantuan\Services\Workflow;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function fundingActor(array $roles): User
{
    $user = new User;
    $user->forceFill(['name' => 'Funding tester', 'email' => Str::uuid().'@example.test',
        'password_hash' => Hash::make('password-test-long'), 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id,
        'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => $roles[0]]);
    DB::table('bantuan_staff')->insert(['user_id' => $user->id, 'roles' => json_encode($roles), 'can_bypass' => false]);

    return $user;
}

function fundingApplication(User $creator, string $status = 'fund_ready', int $amount = 250000): Application
{
    $row = new Application;
    $row->forceFill(['id' => (string) Str::uuid(), 'number' => 'B-'.Str::uuid(), 'name' => 'Penerima dana',
        'nik_hash' => hash('sha256', (string) Str::uuid()), 'applicant' => ['name' => 'Penerima dana'],
        'program' => 'Kesehatan', 'region' => 'Bandung', 'source' => 'online', 'intake_role' => 'call_center',
        'status' => $status, 'created_by' => $creator->id, 'amount' => $amount,
        'distribution_type' => 'verifier', 'distributor_id' => $creator->id, 'version' => 1])->save();

    return $row;
}

function fundingInput(array $rows): array
{
    return ['title' => 'Dana bantuan November', 'notes' => 'Pengajuan kolektif',
        'items' => array_map(fn ($row) => ['id' => $row->id, 'version' => $row->version], $rows)];
}

beforeEach(function () {
    $this->fundingActor = fundingActor(['verifier', 'fund_requester']);
    $this->actingAs($this->fundingActor, 'sanctum');
});

it('creates a persistent card with immutable server amounts and workflow audit for every member', function () {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor, amount: 600000);
    $this->getJson('/api/v1/bantuan/funding-requests/ready')->assertOk()->assertJsonPath('summary.count', 2)->assertJsonPath('summary.totalAmount', 850000);
    $input = fundingInput([$a, $b]);
    $input['totalAmount'] = 1;
    $input['items'][0]['amount'] = 1;
    $response = $this->postJson('/api/v1/bantuan/funding-requests', $input)->assertCreated()
        ->assertJsonPath('data.totalAmount', 850000)->assertJsonPath('data.version', 1)->assertJsonPath('data.status', 'submitted')->assertJsonCount(2, 'data.items');
    $id = $response->json('data.id');
    foreach ([$a, $b] as $row) {
        expect($row->fresh()->status)->toBe('fund_submitted')->and($row->fresh()->version)->toBe(2)
            ->and($row->fresh()->fund_reference)->toBe($response->json('data.number'));
        $this->assertDatabaseHas('bantuan_events', ['application_id' => $row->id, 'action' => 'fund_submit', 'actor_role' => 'fund_requester']);
        $this->assertDatabaseHas('bantuan_funding_request_items', ['application_id' => $row->id, 'amount' => $row->amount, 'submitted_version' => 2, 'active_application_id' => $row->id]);
    }
    $this->getJson('/api/v1/bantuan/funding-requests/'.$id)->assertOk()->assertJsonPath('data.totalAmount', 850000);
    $this->getJson('/api/v1/bantuan/funding-requests/ready')->assertJsonCount(0, 'data');
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a->fresh()]))->assertConflict();
    // Even a legacy/out-of-band return to fund_ready cannot duplicate an active membership.
    $a->refresh()->forceFill(['status' => 'fund_ready', 'version' => 3])->save();
    $this->getJson('/api/v1/bantuan/funding-requests/ready')->assertJsonCount(0, 'data');
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a]))->assertConflict();
    expect(DB::table('bantuan_funding_requests')->count())->toBe(1);
});

it('excludes every earlier stage including Call Center survey review', function (string $stage) {
    $row = fundingApplication($this->fundingActor, $stage);
    $this->getJson('/api/v1/bantuan/funding-requests/ready')->assertOk()->assertJsonCount(0, 'data');
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$row]))->assertConflict();
    expect(DB::table('bantuan_funding_requests')->count())->toBe(0)->and($row->fresh()->status)->toBe($stage);
})->with(['survey_assigned', 'survey_cc_review', 'survey_submitted', 'review2', 'approved']);

it('rejects invalid sets and stale versions without creating partial batches', function () {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor);
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([]))->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a, $a]))->assertUnprocessable();
    $input = fundingInput([$a, $b]);
    $input['items'][1]['version'] = 9;
    $this->postJson('/api/v1/bantuan/funding-requests', $input)->assertConflict();
    expect($a->fresh()->status)->toBe('fund_ready')->and($a->fresh()->version)->toBe(1)
        ->and(DB::table('bantuan_funding_requests')->count())->toBe(0)->and(DB::table('bantuan_events')->count())->toBe(0);
    $input['items'][1] = ['id' => (string) Str::uuid(), 'version' => 1];
    $this->postJson('/api/v1/bantuan/funding-requests', $input)->assertNotFound();
});

it('uses workflow for whole card approvals and rejections and preserves the original snapshots', function (string $decision, string $stage, string $action) {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor, amount: 700000);
    $batch = $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a, $b]))->assertCreated()->json('data');
    $payload = ['version' => 1, 'decision' => $decision, 'reason' => 'Keputusan dana terkonfirmasi.',
        'items' => fundingInput([$a->fresh(), $b->fresh()])['items']];
    $this->postJson('/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision', $payload)->assertOk()
        ->assertJsonPath('data.status', $decision)->assertJsonPath('data.version', 2)->assertJsonPath('data.totalAmount', 950000);
    foreach ([$a, $b] as $row) {
        expect($row->fresh()->status)->toBe($stage)->and($row->fresh()->version)->toBe(3);
        $this->assertDatabaseHas('bantuan_events', ['application_id' => $row->id, 'action' => $action, 'actor_role' => 'fund_requester']);
        $this->assertDatabaseHas('bantuan_funding_request_items', ['application_id' => $row->id, 'amount' => $row->amount,
            'submitted_version' => 2, 'decision_version' => 3, 'active_application_id' => null]);
    }
    $this->postJson('/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision', $payload)->assertConflict();
    $a->refresh()->forceFill(['status' => 'fund_ready', 'amount' => 900000, 'version' => 4])->save();
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a]))->assertCreated()->assertJsonPath('data.totalAmount', 900000);
    $this->getJson('/api/v1/bantuan/funding-requests/'.$batch['id'])->assertJsonPath('data.totalAmount', 950000);
    expect(FundingRequestItem::where('funding_request_id', $batch['id'])->sum('amount'))->toBe(950000);
})->with([['approved', 'fund_approved', 'fund_approve'], ['rejected', 'review2', 'fund_reject']]);

it('checks header and every item version, amount, membership and stage before a bulk decision', function () {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor);
    $batch = $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a, $b]))->assertCreated()->json('data');
    $path = '/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision';
    $payload = ['version' => 1, 'decision' => 'approved', 'items' => fundingInput([$a->fresh(), $b->fresh()])['items']];
    $this->postJson($path, [...$payload, 'version' => 99])->assertConflict();
    $this->postJson($path, [...$payload, 'items' => [$payload['items'][0]]])->assertUnprocessable();
    $this->postJson($path, [...$payload, 'decision' => 'rejected'])->assertUnprocessable();
    $this->postJson($path, [...$payload, 'items' => [$payload['items'][0], $payload['items'][0]]])->assertUnprocessable();
    $b->forceFill(['version' => 3])->save();
    $this->postJson($path, $payload)->assertConflict();
    $b->forceFill(['version' => 2, 'amount' => 100000])->save();
    $this->postJson($path, $payload)->assertConflict();
    $b->forceFill(['amount' => 250000, 'status' => 'fund_approved'])->save();
    $this->postJson($path, $payload)->assertConflict();
    expect($a->fresh()->status)->toBe('fund_submitted')->and($a->fresh()->version)->toBe(2);
    $this->assertDatabaseHas('bantuan_funding_requests', ['id' => $batch['id'], 'status' => 'submitted', 'version' => 1]);
    expect(DB::table('bantuan_events')->where('action', 'fund_approve')->count())->toBe(0);
});

it('rolls back headers items audit and notifications when a later workflow operation fails', function (string $operation) {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor);
    if ($operation === 'decision') {
        $batch = $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a, $b]))->assertCreated()->json('data');
    }
    $beforeEvents = DB::table('bantuan_events')->count();
    $beforeNotifications = DB::table('bantuan_notifications')->count();
    $actual = app(Workflow::class);
    $calls = 0;
    $mock = Mockery::mock(Workflow::class);
    $mock->shouldReceive('perform')->andReturnUsing(function ($request, $id, $action) use ($actual, &$calls) {
        if (++$calls === 2) {
            abort(409, 'Simulated late conflict');
        }

        return $actual->perform($request, $id, $action);
    });
    $this->app->instance(Workflow::class, $mock);
    if ($operation === 'create') {
        $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a, $b]))->assertConflict();
        expect(DB::table('bantuan_funding_requests')->count())->toBe(0)->and(DB::table('bantuan_funding_request_items')->count())->toBe(0);
    } else {
        $this->postJson('/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision', ['version' => 1, 'decision' => 'approved',
            'items' => fundingInput([$a->fresh(), $b->fresh()])['items']])->assertConflict();
        expect(DB::table('bantuan_funding_request_items')->whereNotNull('active_application_id')->count())->toBe(2);
        $this->assertDatabaseHas('bantuan_funding_requests', ['id' => $batch['id'], 'status' => 'submitted', 'version' => 1]);
    }
    expect($a->fresh()->status)->toBe($operation === 'create' ? 'fund_ready' : 'fund_submitted')
        ->and($b->fresh()->status)->toBe($operation === 'create' ? 'fund_ready' : 'fund_submitted')
        ->and(DB::table('bantuan_events')->count())->toBe($beforeEvents)
        ->and(DB::table('bantuan_notifications')->count())->toBe($beforeNotifications);
})->with(['create', 'decision']);

it('enforces module permissions with multi-role grants and read-only operational roles', function () {
    $row = fundingApplication($this->fundingActor);
    $batch = $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$row]))->assertCreated()->json('data');
    $payload = ['version' => 1, 'decision' => 'approved', 'items' => fundingInput([$row->fresh()])['items']];
    foreach (['treasurer', 'chair'] as $role) {
        $this->actingAs(fundingActor([$role]), 'sanctum')->getJson('/api/v1/bantuan/funding-requests')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/bantuan/funding-requests/ready')->assertForbidden();
        $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$row]))->assertForbidden();
        $this->postJson('/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision', $payload)->assertForbidden();
    }
    $this->actingAs(fundingActor(['verifier']), 'sanctum')->getJson('/api/v1/bantuan/funding-requests')->assertForbidden();
    $this->getJson('/api/v1/bantuan/funding-requests/'.$batch['id'])->assertForbidden();
    $this->actingAs(fundingActor(['admin']), 'sanctum')->postJson('/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision', $payload)->assertOk();
});

it('filters and paginates ready applications and cards without widening access', function () {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor);
    $b->forceFill(['program' => 'Pendidikan', 'region' => 'Jakarta'])->save();
    $this->getJson('/api/v1/bantuan/funding-requests/ready?program=Kesehatan&region=Bandung')->assertJsonCount(1, 'data')->assertJsonPath('summary.totalAmount', 250000);
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a]))->assertCreated();
    $this->getJson('/api/v1/bantuan/funding-requests?status=approved')->assertJsonCount(0, 'data')->assertJsonPath('summary.totalAmount', 0);
    $this->getJson('/api/v1/bantuan/funding-requests?search=November')->assertJsonCount(1, 'data')->assertJsonPath('summary.count', 1);
    $this->getJson('/api/v1/bantuan/funding-requests?status=submitted&page=2')->assertJsonCount(0, 'data')->assertJsonPath('summary.count', 1);
    $this->getJson('/api/v1/bantuan/funding-requests?status=invalid')->assertUnprocessable();
});

it('blocks individual decisions and distributor changes on active cards even with forged client flags', function () {
    $a = fundingApplication($this->fundingActor);
    $b = fundingApplication($this->fundingActor, amount: 700000);
    $batch = $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$a, $b]))->assertCreated()->json('data');
    $input = ['version' => 2, 'reason' => 'Trying an individual decision.', 'bantuan_funding_request_id' => $batch['id'],
        'fundingRequestId' => $batch['id'], 'internalBatch' => true];
    foreach (['fund_approve', 'fund_reject'] as $action) {
        $this->postJson('/api/v1/bantuan/applications/'.$a->id.'/actions/'.$action, $input,
            ['X-Bantuan-Funding-Request-Id' => $batch['id']])->assertConflict();
    }
    $cc = fundingActor(['call_center']);
    $this->actingAs($cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$a->id.'/actions/assign_distributor',
        [...$input, 'distributionType' => 'verifier', 'distributorId' => $this->fundingActor->id])->assertConflict();
    expect($a->fresh()->status)->toBe('fund_submitted')->and($a->fresh()->version)->toBe(2)
        ->and(DB::table('bantuan_funding_request_items')->whereNotNull('active_application_id')->count())->toBe(2);
    $this->actingAs($this->fundingActor, 'sanctum')->getJson('/api/v1/bantuan/funding-requests/'.$batch['id'])
        ->assertJsonPath('data.totalAmount', 950000)->assertJsonPath('data.status', 'submitted');
    $this->postJson('/api/v1/bantuan/funding-requests/'.$batch['id'].'/decision', ['version' => 1, 'decision' => 'approved',
        'items' => fundingInput([$a->fresh(), $b->fresh()])['items']])->assertOk()->assertJsonPath('data.totalAmount', 950000);
});

it('keeps legacy individual funding decisions available outside active cards', function () {
    $row = fundingApplication($this->fundingActor);
    $this->postJson('/api/v1/bantuan/applications/'.$row->id.'/actions/fund_submit', ['version' => 1])->assertOk();
    $this->postJson('/api/v1/bantuan/applications/'.$row->id.'/actions/fund_approve', ['version' => 2])->assertOk();
    expect($row->fresh()->status)->toBe('fund_approved')->and(DB::table('bantuan_funding_requests')->count())->toBe(0);
});

it('provides funding descriptions without exposing identity documents or full applicant records', function () {
    $row = fundingApplication($this->fundingActor);
    $row->forceFill(['applicant' => ['name' => 'Penerima dana', 'nik' => '0000000000000001', 'phone' => '00000000000', 'problem' => 'Penghasilan terhenti.'],
        'survey' => ['needs' => 'Paket pangan satu bulan.', 'notes' => 'Catatan internal']])->save();
    $this->getJson('/api/v1/bantuan/funding-requests/ready')->assertOk()
        ->assertJsonPath('data.0.problem', 'Penghasilan terhenti.')->assertJsonPath('data.0.needs', 'Paket pangan satu bulan.')
        ->assertJsonMissingPath('data.0.applicant')->assertJsonMissingPath('data.0.survey')->assertJsonMissingPath('data.0.nik');
    $this->postJson('/api/v1/bantuan/funding-requests', fundingInput([$row]))->assertCreated()
        ->assertJsonPath('data.items.0.problem', 'Penghasilan terhenti.')->assertJsonPath('data.items.0.needs', 'Paket pangan satu bulan.')
        ->assertJsonMissingPath('data.items.0.applicant');
});
