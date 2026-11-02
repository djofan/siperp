<?php

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Models\MustahiqProfile;
use App\Modules\Bantuan\Services\Intake;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function mustahiqActor(array $roles): User {
    $user = new User;
    $user->forceFill(['name' => 'Petugas tes', 'email' => Str::uuid().'@example.test', 'password_hash' => Hash::make('password-test-long'), 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => $roles[0]]);
    DB::table('bantuan_staff')->insert(['user_id' => $user->id, 'roles' => json_encode($roles), 'can_bypass' => false]);
    return $user;
}
function mustahiqApplication(User $creator, string $status = 'draft', string $nik = '3271051234567890'): Application {
    $row = new Application;
    $row->forceFill(['id' => (string) Str::uuid(), 'number' => 'B-'.Str::uuid(), 'name' => 'Siti',
        'nik_hash' => app(Intake::class)->nikHash($nik), 'applicant' => ['name' => 'Siti', 'nik' => $nik, 'city' => 'Bogor', 'phone' => '081234567890'],
        'program' => 'Kebutuhan Pokok', 'region' => 'Bogor', 'source' => 'online', 'intake_role' => 'call_center',
        'status' => $status, 'created_by' => $creator->id, 'amount' => 500000, 'version' => 1,
        'handover' => $status === 'completed' ? ['amount' => 450000] : null])->save();
    return $row;
}

it('denies directory and direct profile access for only field roles', function (array $roles) {
    $actor = mustahiqActor($roles);$row = mustahiqApplication($actor);
    $this->actingAs($actor, 'sanctum');
    $this->getJson('/api/v1/bantuan/mustahiq')->assertForbidden();
    $this->getJson('/api/v1/bantuan/mustahiq/'.$row->id)->assertForbidden();
    $this->putJson('/api/v1/bantuan/mustahiq/'.$row->id, [])->assertForbidden();
})->with([['roles' => ['verifier']], ['roles' => ['volunteer']], ['roles' => ['verifier', 'volunteer']]]);

it('grants global read access to every other role and their field-role combinations but not edits', function (string $role) {
    $owner = mustahiqActor(['call_center']);$row = mustahiqApplication($owner);
    $reader = mustahiqActor(['verifier', $role]);$this->actingAs($reader, 'sanctum');
    $this->getJson('/api/v1/bantuan/mustahiq')->assertOk()->assertJsonPath('total', 1);
    $this->getJson('/api/v1/bantuan/mustahiq/'.$row->id)->assertOk()->assertJsonPath('data.canEdit', false)->assertJsonPath('data.applicant.nik', '3271051234567890');
    $this->putJson('/api/v1/bantuan/mustahiq/'.$row->id, [])->assertForbidden();
})->with(['admin', 'requester', 'approver', 'chair', 'treasurer', 'fund_requester']);

it('groups by NIK and separates drafts and actual handover from allocations', function () {
    $actor = mustahiqActor(['call_center']);$this->actingAs($actor, 'sanctum');
    $first = mustahiqApplication($actor, 'completed');
    mustahiqApplication($actor, 'cancelled');mustahiqApplication($actor, 'draft');mustahiqApplication($actor, 'disbursed');
    mustahiqApplication($actor, 'draft', '3271051234567891');
    $this->getJson('/api/v1/bantuan/mustahiq')->assertOk()->assertJsonPath('total', 2);
    $this->getJson('/api/v1/bantuan/mustahiq?received=yes')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.records', 4);
    $this->getJson('/api/v1/bantuan/mustahiq?received=no')->assertOk()->assertJsonPath('total', 1);
    $this->getJson('/api/v1/bantuan/mustahiq?search=3271051234567890')->assertOk()->assertJsonPath('total', 1);
    $this->getJson('/api/v1/bantuan/mustahiq/'.$first->id)->assertOk()->assertJsonPath('data.summary.submissions', 3)
        ->assertJsonPath('data.summary.drafts', 1)->assertJsonPath('data.summary.received', 1)->assertJsonPath('data.summary.receivedAmount', 450000)->assertJsonCount(4, 'data.history');
});

it('allows only CC to correct encrypted master data with audit and concurrency protection without rewriting history', function () {
    $actor = mustahiqActor(['verifier', 'call_center']);$this->actingAs($actor, 'sanctum');$row = mustahiqApplication($actor, 'completed');
    $body = ['version' => 0, 'sourceId' => $row->id, 'sourceVersion' => 1, 'applicant' => [...$row->applicant, 'name' => 'Siti terbaru']];
    $url = '/api/v1/bantuan/mustahiq/'.$row->id;
    $this->putJson($url, $body)->assertOk()->assertJsonPath('data.canEdit', true)->assertJsonPath('data.version', 1)->assertJsonPath('data.applicant.name', 'Siti terbaru');
    expect($row->fresh()->applicant['name'])->toBe('Siti')->and($row->fresh()->status)->toBe('completed');
    expect(DB::table('bantuan_mustahiq_profiles')->value('applicant'))->not->toContain('Siti terbaru');
    $this->assertDatabaseHas('bantuan_events', ['action' => 'update_mustahiq', 'actor_role' => 'call_center']);
    $this->getJson('/api/v1/bantuan/mustahiq?search=terbaru')->assertOk()->assertJsonPath('data.0.name', 'Siti terbaru');
    $this->putJson($url, $body)->assertConflict();
    $body['version'] = 1;$body['applicant']['nik'] = '3271051234567899';$this->putJson($url, $body)->assertUnprocessable();
});

it('syncs CC survey corrections into a profile without forwarding the application', function () {
    $actor = mustahiqActor(['call_center']);$this->actingAs($actor, 'sanctum');$row = mustahiqApplication($actor, 'survey_cc_review');
    $this->postJson('/api/v1/bantuan/applications/'.$row->id.'/actions/survey_review_save', ['version' => 1, 'survey' => ['background' => 'Kondisi diperiksa'], 'applicant' => ['name' => 'Koreksi survei']])->assertOk();
    expect($row->fresh()->status)->toBe('survey_cc_review')->and(MustahiqProfile::find($row->nik_hash)->applicant['name'])->toBe('Koreksi survei');
});
