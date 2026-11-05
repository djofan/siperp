<?php

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Services\Reminders;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function bantuanSurvey(): array
{
    return ['date' => now()->toDateString(), 'hasSktm' => false, 'sktmExplanation' => 'Sedang mengurus',
        'background' => 'Latar belakang', 'currentCondition' => 'Kondisi uji', 'needs' => 'Biaya pengobatan',
        'efforts' => 'Bekerja', 'homeObservation' => 'Rumah sederhana', 'stayDuration' => 5, 'stayUnit' => 'tahun',
        'socialRecord' => 'Baik', 'recommendation' => 'layak'];
}

it('keeps Call Center monitoring separate from their own verifier tasks', function () {
    bantuanRoles($this->cc, ['call_center', 'verifier']);
    foreach ([$this->cc->id, $this->verifier->id] as $verifier) {
        $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
        Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $verifier])->save();
    }
    $this->getJson('/api/v1/bantuan/dashboard')->assertOk()
        ->assertJsonPath('data.byStatus.survey_assigned', 2)
        ->assertJsonPath('data.taskCounts.survey.survey_assigned', 1);
    $this->getJson('/api/v1/bantuan/applications?states=survey_assigned&task=survey')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/bantuan/applications?states=survey_assigned')->assertOk()->assertJsonCount(2, 'data');
});

it('allows assigned verifier and call center to append missing survey documents during CC review', function (string $kind) {
    Storage::fake('local');
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_cc_review', 'verifier_id' => $this->verifier->id])->save();
    $old = bantuanDoc($id, 'survey_front');
    DB::table('bantuan_documents')->where('id', $old)->update(['used_at' => now()]);
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    foreach ([$this->verifier, $this->cc] as $actor) {
        $this->actingAs($actor, 'sanctum')->post('/api/v1/bantuan/applications/'.$id.'/documents',
            ['kind' => $kind, 'file' => UploadedFile::fake()->createWithContent('tambahan.png', $png)], ['Accept' => 'application/json'])->assertCreated();
    }
    expect(DB::table('bantuan_documents')->where('id', $old)->value('deleted_at'))->toBeNull();
    expect(Application::findOrFail($id)->status)->toBe('survey_cc_review');
    $this->actingAs(bantuanUser('verifier'), 'sanctum')->post('/api/v1/bantuan/applications/'.$id.'/documents',
        ['kind' => $kind, 'file' => UploadedFile::fake()->createWithContent('lain.png', $png)], ['Accept' => 'application/json'])->assertStatus(404);
})->with(['sktm', 'survey_other', 'ktp', 'kk', 'supporting']);

it('allows a Call Center verifier to review their own survey before forwarding to an independent approver', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    bantuanRoles($this->verifier, ['verifier', 'call_center']);
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    foreach (['ktp', 'kk', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    $url = '/api/v1/bantuan/applications/'.$id.'/actions/';
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'survey_submit', ['version' => 1, 'survey' => bantuanSurvey()])
        ->assertOk()->assertJsonPath('data.status', 'survey_cc_review');
    $this->postJson($url.'survey_review_save', ['version' => 2, 'survey' => ['background' => 'Koreksi hasil sendiri']])
        ->assertOk()->assertJsonPath('data.status', 'survey_cc_review');
    $this->postJson($url.'survey_review_submit', ['version' => 3])
        ->assertOk()->assertJsonPath('data.status', 'survey_submitted');
    expect(DB::table('bantuan_notifications')->where('application_id', $id)->where('user_id', $this->approver->id)->exists())->toBeTrue();
    bantuanRoles($this->verifier, ['verifier', 'call_center', 'approver']);
    $this->postJson($url.'approve', ['version' => 4, 'amount' => 100])->assertForbidden();
    expect(Application::findOrFail($id)->status)->toBe('survey_submitted');
});

it('reviews and corrects a full survey and applicant before explicitly forwarding without new evidence', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    foreach (['ktp', 'kk', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    DB::table('bantuan_notifications')->where('application_id', $id)->delete();
    $url = '/api/v1/bantuan/applications/'.$id.'/actions/';
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'survey_submit', ['version' => 1, 'survey' => bantuanSurvey()])
        ->assertOk()->assertJsonPath('data.status', 'survey_cc_review');
    expect(DB::table('bantuan_documents')->where('application_id', $id)->whereNull('used_at')->count())->toBe(2);
    expect(DB::table('bantuan_notifications')->where('application_id', $id)->where('user_id', $this->approver->id)->count())->toBe(0);
    $this->actingAs($this->approver, 'sanctum')->postJson($url.'approve', ['version' => 2, 'amount' => 100])->assertConflict();
    $reviewer = $this->cc; // Intake ownership must not prevent reviewing another verifier's survey.
    $this->actingAs($reviewer, 'sanctum')->postJson($url.'survey_review_submit', ['version' => 1])->assertConflict();
    $notifications = DB::table('bantuan_notifications')->where('application_id', $id)->count();
    $this->postJson($url.'survey_review_save', ['version' => 2, 'survey' => ['background' => 'Koreksi CC', 'needs' => null],
        'applicant' => ['name' => 'Nama dikoreksi', 'nik' => '3271051234567891', 'income' => 200000]])
        ->assertOk()->assertJsonPath('data.status', 'survey_cc_review')->assertJsonPath('data.version', 3);
    expect(DB::table('bantuan_notifications')->where('application_id', $id)->count())->toBe($notifications);
    $this->postJson($url.'survey_review_submit', ['version' => 3])->assertUnprocessable();
    $original = DB::table('bantuan_documents')->where('application_id', $id)->where('kind', 'survey_front')->value('id');
    DB::table('bantuan_documents')->where('id', $original)->update(['deleted_at' => now()]);
    bantuanDoc($id, 'survey_front'); // An unused replacement cannot stand in for original survey evidence.
    $this->postJson($url.'survey_review_submit', ['version' => 3, 'survey' => ['needs' => 'Kebutuhan dikoreksi']])->assertUnprocessable();
    DB::table('bantuan_documents')->where('id', $original)->update(['deleted_at' => null]);
    $this->postJson($url.'survey_review_submit', ['version' => 3, 'survey' => ['needs' => 'Kebutuhan dikoreksi']])
        ->assertOk()->assertJsonPath('data.status', 'survey_submitted');
    $row = Application::findOrFail($id);
    expect($row->applicant['name'])->toBe('Nama dikoreksi')->and($row->applicant['income'])->toBe(200000)
        ->and($row->nik_hash)->toBe(app(\App\Modules\Bantuan\Services\Intake::class)->nikHash('3271051234567891'))
        ->and($row->survey['background'])->toBe('Koreksi CC')->and($row->survey['needs'])->toBe('Kebutuhan dikoreksi');
    expect(DB::table('bantuan_notifications')->where('application_id', $id)->where('user_id', $this->approver->id)->exists())->toBeTrue();
    $event = DB::table('bantuan_events')->where('application_id', $id)->where('action', 'survey_review_save')->first();
    $details = json_decode(Crypt::decryptString($event->details), true);
    expect($event->actor_role)->toBe('call_center')->and($details['applicant']['name'])->toBe('Nama dikoreksi');
});

it('protects CC survey review from unauthorized roles across multiple grants', function (string $relationship) {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $user = bantuanUser('verifier');
    bantuanRoles($user, ['verifier', 'call_center', 'approver']);
    Application::findOrFail($id)->forceFill(['status' => 'survey_cc_review', $relationship => $user->id, 'survey' => bantuanSurvey()])->save();
    foreach (['ktp', 'kk', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    DB::table('bantuan_documents')->where('application_id', $id)->update(['used_at' => now()]);
    foreach (['survey_review_save', 'survey_review_submit', 'survey_return'] as $action) {
        $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$action,
            ['version' => 1, 'reason' => 'Perbaiki informasi survei.'])->assertForbidden();
    }
    $this->actingAs(bantuanUser('admin'), 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_review_submit', ['version' => 1])->assertOk();
})->with(['verifier_id']);

it('returns surveys to the assigned verifier and retains evidence when correcting data', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    $url = '/api/v1/bantuan/applications/'.$id.'/actions/';
    foreach (['ktp', 'kk', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'survey_submit', ['version' => 1, 'survey' => bantuanSurvey()])->assertOk();
    $reviewer = bantuanUser('call_center');
    $this->actingAs($reviewer, 'sanctum')->postJson($url.'survey_return', ['version' => 2])->assertUnprocessable();
    $this->postJson($url.'survey_return', ['version' => 2, 'reason' => 'Periksa kembali kondisi rumah.'])->assertOk()
        ->assertJsonPath('data.status', 'survey_assigned')->assertJsonPath('data.verifierId', $this->verifier->id);
    $evidence = DB::table('bantuan_documents')->where('application_id', $id)->pluck('used_at', 'id')->all();
    $corrected = [...bantuanSurvey(), 'currentCondition' => 'Kondisi rumah sudah diperiksa dan dilengkapi.'];
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'survey_submit', ['version' => 3, 'survey' => $corrected])
        ->assertOk()->assertJsonPath('data.status', 'survey_cc_review');
    expect(Application::findOrFail($id)->survey['currentCondition'])->toBe($corrected['currentCondition']);
    expect(DB::table('bantuan_documents')->where('application_id', $id)->pluck('used_at', 'id')->all())->toBe($evidence);
    $this->actingAs($reviewer, 'sanctum')->postJson($url.'survey_review_submit', ['version' => 4])
        ->assertOk()->assertJsonPath('data.status', 'survey_submitted');
});

it('allows only the assigned verifier to decline with a reason and lets CC reassign', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id, 'survey' => ['background' => 'Draft']])->save();
    $url = '/api/v1/bantuan/applications/'.$id.'/actions/';
    $other = bantuanUser('verifier');
    bantuanRoles($other, ['verifier', 'call_center']);
    $this->actingAs($other, 'sanctum')->postJson($url.'survey_decline', ['version' => 1, 'reason' => 'Tidak dapat bertugas.'])->assertForbidden();
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'survey_decline', ['version' => 1])->assertUnprocessable();
    $this->postJson($url.'survey_decline', ['version' => 9, 'reason' => 'Tidak dapat bertugas.'])->assertConflict();
    $this->postJson($url.'survey_decline', ['version' => 1, 'reason' => 'Tidak dapat bertugas.'])->assertOk()
        ->assertJsonPath('data.status', 'survey_assignment')->assertJsonPath('data.verifierId', null);
    expect(DB::table('bantuan_notifications')->where('application_id', $id)->where('user_id', $this->cc->id)
        ->where('message', 'like', '%Tidak dapat bertugas.%')->exists())->toBeTrue();
    $this->postJson($url.'survey_save', ['version' => 2, 'survey' => []])->assertNotFound();
    $this->actingAs($this->cc, 'sanctum')->postJson($url.'assign_survey', ['version' => 2, 'surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $other->id,
        'reason' => 'Pengganti sesuai wilayah tugas.'])->assertOk();
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'survey_submit', ['version' => 3, 'survey' => bantuanSurvey()])->assertNotFound();
    $event = DB::table('bantuan_events')->where('application_id', $id)->where('action', 'survey_decline')->first();
    expect(json_decode(Crypt::decryptString($event->details), true)['previousVerifierId'])->toBe($this->verifier->id);
    expect(json_decode(Crypt::decryptString($event->details), true)['reason'])->toBe('Tidak dapat bertugas.');
    $assignment = DB::table('bantuan_events')->where('application_id', $id)->where('action', 'assign_survey')->first();
    expect(json_decode(Crypt::decryptString($assignment->details), true)['reason'])->toBe('Pengganti sesuai wilayah tugas.');
});

it('migrates pending legacy surveys once without changing decided or already reviewed applications', function () {
    $ids = [];
    foreach (['legacy', 'reviewed', 'approved'] as $kind) {
        $ids[$kind] = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
        Application::findOrFail($ids[$kind])->forceFill(['status' => $kind === 'approved' ? 'approved' : 'survey_submitted', 'survey' => bantuanSurvey()])->save();
    }
    DB::table('bantuan_events')->insert(['id' => (string) Str::uuid(), 'application_id' => $ids['reviewed'], 'actor_id' => $this->cc->id,
        'actor_role' => 'call_center', 'action' => 'survey_review_submit', 'details' => Crypt::encryptString('{}'), 'created_at' => now()]);
    $doc = bantuanDoc($ids['legacy'], 'survey_front');
    $migration = require database_path('migrations/2026_11_01_000000_add_bantuan_survey_cc_review.php');
    $migration->up(); $migration->up(); $migration->down();
    expect(Application::findOrFail($ids['legacy'])->status)->toBe('survey_cc_review')
        ->and(Application::findOrFail($ids['legacy'])->version)->toBe(2)
        ->and(Application::findOrFail($ids['legacy'])->survey)->toBe(bantuanSurvey())
        ->and(Application::findOrFail($ids['reviewed'])->status)->toBe('survey_submitted')
        ->and(Application::findOrFail($ids['approved'])->status)->toBe('approved')
        ->and(DB::table('bantuan_documents')->where('id', $doc)->value('used_at'))->not->toBeNull();
});

it('persists explicit destination pins with assignment roles version checks and encrypted audit', function (string $status) {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => $status, 'verifier_id' => $this->verifier->id,
        'survey' => ['latitude' => -7, 'longitude' => 108]])->save();
    $url = '/api/v1/bantuan/applications/'.$id.'/actions/survey_location';
    $this->actingAs($this->approver, 'sanctum')->postJson($url, ['version' => 1, 'latitude' => -6.9, 'longitude' => 107.6])->assertForbidden();
    $this->actingAs($this->verifier, 'sanctum')->postJson($url, ['version' => 1, 'latitude' => -6.9])->assertUnprocessable();
    $this->postJson($url, ['version' => 1, 'latitude' => -91, 'longitude' => 107.6])->assertUnprocessable();
    $this->postJson($url, ['version' => 9, 'latitude' => -6.9, 'longitude' => 107.6])->assertConflict();
    $this->postJson($url, ['version' => 1, 'latitude' => -6.9, 'longitude' => 107.6])->assertOk()
        ->assertJsonPath('data.status', $status)->assertJsonPath('data.version', 2);
    $row = Application::findOrFail($id);
    expect($row->survey_location['latitude'])->toBe(-6.9)->and($row->survey_location['longitude'])->toBe(107.6)
        ->and($row->survey['latitude'])->toBe(-7);
    expect(DB::table('bantuan_applications')->where('id', $id)->value('survey_location'))->not->toContain('107.6');
    $this->actingAs($this->cc, 'sanctum')->postJson($url, ['version' => 2, 'latitude' => 0, 'longitude' => 0])->assertOk();
    $event = DB::table('bantuan_events')->where('application_id', $id)->where('action', 'survey_location')->where('actor_role', 'verifier')->first();
    expect(json_decode(Crypt::decryptString($event->details), true)['surveyLocation']['latitude'])->toBe(-6.9);
    Application::findOrFail($id)->forceFill(['status' => 'survey_submitted'])->save();
    $this->postJson($url, ['version' => 3, 'latitude' => 0, 'longitude' => 0])->assertConflict();
})->with(['survey_assignment', 'survey_assigned', 'survey_cc_review']);

it('validates nullable paired applicant coordinates without deriving destination from visit position', function () {
    foreach ([['latitude' => -6.9], ['longitude' => 107.6], ['latitude' => null, 'longitude' => 107.6],
        ['latitude' => -91, 'longitude' => 107], ['latitude' => 0, 'longitude' => 181]] as $location) {
        $input = bantuanInput(); $input['applicant'] = [...$input['applicant'], ...$location];
        $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertUnprocessable();
    }
    foreach ([[], ['latitude' => null, 'longitude' => null], ['latitude' => -6.9, 'longitude' => -107.6], ['latitude' => 0, 'longitude' => 0]] as $location) {
        $input = bantuanInput(); $input['applicant'] = [...$input['applicant'], ...$location];
        $id = $this->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
        expect(Application::findOrFail($id)->applicant['latitude'] ?? null)->toBe($location['latitude'] ?? null);
    }
});

function bantuanUser(string $role): User
{
    $user = new User;
    $user->forceFill(['name' => $role, 'email' => Str::uuid().'@example.test', 'password_hash' => Hash::make('password-test-long'), 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id,
        'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => $role]);

    return $user;
}

function bantuanInput(): array
{
    return ['source' => 'online', 'program' => 'Kesehatan', 'region' => 'Bandung',
        'applicant' => ['bypassKnowledge' => 'Kondisi telah diperiksa langsung', 'bypassCondition' => 'Kondisi telah diperiksa langsung', 'bypassHome' => 'Kondisi telah diperiksa langsung', 'bypassExpenses' => 'Kondisi telah diperiksa langsung', 'bypassEfforts' => 'Kondisi telah diperiksa langsung', 'bypassNeeds' => 'Kondisi telah diperiksa langsung', 'bypassRecommendation' => 'Kondisi telah diperiksa langsung', 'name' => 'Pemohon Uji', 'nik' => '3271051234567890', 'birthPlace' => 'Bandung', 'birthDate' => '1980-01-01',
            'gender' => 'laki_laki', 'maritalStatus' => 'Menikah', 'street' => 'Alamat uji', 'rtRw' => '01/02', 'village' => 'Desa',
            'district' => 'Kecamatan', 'city' => 'Bandung', 'housing' => 'Menumpang', 'job' => 'Buruh', 'income' => 1000000,
            'incomePeriod' => 'bulan', 'dependentCount' => 2, 'phone' => '08123456789', 'prayer' => 'Ya', 'smoking' => 'Tidak',
            'previousAid' => false, 'publicationConsent' => false, 'hasSktm' => false, 'willingSktm' => true, 'informationSource' => 'Tetangga', 'problem' => 'Memerlukan biaya pengobatan'],
        'reporter' => ['name' => 'Pelapor Uji', 'date' => now()->toDateString(), 'maritalStatus' => 'Menikah', 'type' => 'Perorangan', 'phone' => '08123456700', 'address' => 'Alamat pelapor']];
}

function bantuanRoles(User $user, array $roles, bool $canBypass = false): void
{
    DB::table('module_access')->where('user_id', $user->id)->update(['role' => $roles[0]]);
    DB::table('bantuan_staff')->updateOrInsert(['user_id' => $user->id], ['roles' => json_encode($roles), 'can_bypass' => $canBypass]);
}

function bantuanDoc(string $id, string $kind): string
{
    $doc = (string) Str::uuid();
    DB::table('bantuan_documents')->insert(['id' => $doc, 'application_id' => $id, 'kind' => $kind, 'path' => 'not-public.enc',
        'mime' => 'image/png', 'uploaded_by' => 'test', 'created_at' => now()]);

    return $doc;
}

beforeEach(function () {
    Storage::fake('local');
    $this->cc = bantuanUser('call_center');
    $this->approver = bantuanUser('approver');
    $this->verifier = bantuanUser('verifier');
    $this->fund = bantuanUser('fund_requester');
    $this->treasurer = bantuanUser('treasurer');
});

it('routes staff applications directly to approver before Call Center assigns a verifier', function (string $source) {
    $requester = bantuanUser('requester');
    $input = [...bantuanInput(), 'source' => $source, 'intakeRole' => 'call_center'];
    $id = $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)
        ->assertCreated()->assertJsonPath('data.intakeRole', 'requester')->json('data.id');
    if ($source === 'walk_in') { bantuanDoc($id, 'ktp'); bantuanDoc($id, 'face'); }
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'review1');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_pass', ['version' => 2])->assertForbidden();
    $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/assign_survey', ['version' => 2, 'surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $this->verifier->id])->assertConflict();
    expect(DB::table('bantuan_notifications')->where('application_id', $id)->where('user_id', $this->approver->id)->exists())->toBeTrue();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_pass', ['version' => 2])->assertConflict();
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/review1_approve', ['version' => 2])->assertOk()->assertJsonPath('data.status', 'survey_assignment');
    $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/assign_survey', ['version' => 3, 'surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $this->verifier->id])->assertOk()->assertJsonPath('data.status', 'survey_assigned');
    $this->actingAs($this->verifier, 'sanctum')->getJson('/api/v1/bantuan/applications/'.$id)->assertOk();
})->with(['online', 'walk_in']);

it('lets staff see only their own applications and edit only drafts or returned data', function () {
    $other = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
    $requester = bantuanUser('requester');
    $id = $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $this->getJson('/api/v1/bantuan/applications')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
    $this->getJson('/api/v1/bantuan/dashboard')->assertJsonPath('data.total', 1);
    $this->getJson('/api/v1/bantuan/applications/'.$other)->assertNotFound();
    $this->putJson('/api/v1/bantuan/applications/'.$other, [...bantuanInput(), 'version' => 1])->assertNotFound();
    $this->postJson('/api/v1/bantuan/duplicate-check', ['nik' => bantuanInput()['applicant']['nik'], 'excludeId' => $id])->assertJsonPath('data.count', 0);
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk();
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...bantuanInput(), 'version' => 2])->assertConflict();
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/request_data', ['version' => 2, 'reason' => 'Lengkapi kebutuhan pemohon.'])->assertOk();
    $this->actingAs($requester, 'sanctum')->putJson('/api/v1/bantuan/applications/'.$id, [...bantuanInput(), 'version' => 3, 'intakeRole' => 'call_center'])->assertOk()->assertJsonPath('data.intakeRole', 'requester');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 4])->assertOk()->assertJsonPath('data.status', 'review1');
});

it('preserves the creating role after new grants and legacy switches and forbids reviewing a staff application yourself', function () {
    $requester = bantuanUser('requester');
    $id = $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    bantuanRoles($requester, ['requester', 'call_center']);
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'call_center'])->assertOk();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'review1');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_pass', ['version' => 2])->assertConflict();
    $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_pass', ['version' => 2])->assertConflict();
});

it('returns reopened staff rejections to Approver review', function () {
    $requester = bantuanUser('requester');
    $id = $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk();
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/review1_reject', ['version' => 2, 'reason' => 'Data perlu ditinjau kembali.'])->assertOk();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/reopen', ['version' => 3, 'reason' => 'Ada informasi baru dari pemohon.'])->assertOk()->assertJsonPath('data.status', 'review1');
});

it('lets staff upload private intake photos and blocks bypass and operational decisions', function () {
    $requester = bantuanUser('requester');
    $id = $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $doc = $this->post('/api/v1/bantuan/applications/'.$id.'/documents', ['kind' => 'supporting', 'file' => UploadedFile::fake()->createWithContent('foto.png', $png)], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
    $this->get('/api/v1/bantuan/documents/'.$doc)->assertOk()->assertContent($png);
    $this->deleteJson('/api/v1/bantuan/documents/'.$doc)->assertOk();
    $this->postJson('/api/v1/bantuan/applications', [...bantuanInput(), 'source' => 'bypass', 'bypassReason' => 'Harus langsung ditinjau.'])->assertUnprocessable();
    foreach (['approve', 'assign_survey', 'fund_submit', 'fund_approve', 'disburse', 'handover'] as $action) {
        $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$action, ['version' => 1])->assertForbidden();
    }
});

it('allows staff cancellation in draft and protects applications already sent to Approver', function () {
    $requester = bantuanUser('requester');
    $id = $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/cancel', ['version' => 1, 'reason' => 'Pemohon tidak melanjutkan.'])->assertOk();
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/reopen', ['version' => 2, 'reason' => 'Pemohon melanjutkan kembali.'])->assertOk()->assertJsonPath('data.status', 'review1');
    $this->actingAs($requester, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/cancel', ['version' => 3, 'reason' => 'Tidak jadi melanjutkan.'])->assertForbidden();
});

it('backfills the original intake role from the creation audit without resetting application data', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::whereKey($id)->update(['intake_role' => null]);
    $migration = require database_path('migrations/2026_10_30_000000_add_bantuan_intake_role.php');
    $migration->up();
    expect(Application::findOrFail($id)->intake_role)->toBe('call_center')->and(Application::findOrFail($id)->status)->toBe('draft');
    $migration->up();
    expect(Application::findOrFail($id)->applicant['name'])->toBe(bantuanInput()['applicant']['name']);
});

it('lets module admins grant the staff application role through the team form', function () {
    $admin = bantuanUser('admin');
    $id = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/bantuan/staff', ['name' => 'Petugas Pengajuan', 'password' => 'password-aman-123',
        'roles' => ['requester'], 'canBypass' => false])->assertCreated()->json('data.id');
    $this->actingAs(User::findOrFail($id), 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'requester');
    $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated();
});

it('deletes only owned drafts and removes related evidence and notifications', function () {
    $input = [...bantuanInput(), 'draft' => true];
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $doc = bantuanDoc($id, 'face');
    $path = 'bantuan/'.$id.'/'.$doc.'.enc';
    DB::table('bantuan_documents')->where('id', $doc)->update(['path' => $path]);
    Storage::disk('local')->put($path, 'test evidence');
    $this->deleteJson('/api/v1/bantuan/applications/'.$id, ['version' => 9])->assertConflict();
    $this->actingAs($this->approver, 'sanctum')->deleteJson('/api/v1/bantuan/applications/'.$id, ['version' => 1])->assertForbidden();
    $this->actingAs($this->cc, 'sanctum')->deleteJson('/api/v1/bantuan/applications/'.$id, ['version' => 1])->assertOk();
    $this->assertDatabaseMissing('bantuan_applications', ['id' => $id]);
    $this->assertDatabaseMissing('bantuan_documents', ['application_id' => $id]);
    $this->assertDatabaseMissing('bantuan_events', ['application_id' => $id]);
    Storage::disk('local')->assertMissing($path);
    $sent = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/applications/'.$sent.'/actions/submit', ['version' => 1])->assertOk();
    $this->deleteJson('/api/v1/bantuan/applications/'.$sent, ['version' => 2])->assertConflict();
    expect(Application::findOrFail($sent))->not->toBeNull();
});

it('records the actual handover amount without a separate difference reason', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'disbursed', 'distribution_type' => 'direct', 'amount' => 1000000])->save();
    bantuanDoc($id, 'handover');
    bantuanDoc($id, 'certificate');
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/handover', [
        'version' => 1, 'handover' => ['method' => 'tunai', 'date' => now()->toDateString(), 'amount' => 900000],
    ])->assertOk()->assertJsonPath('data.status', 'completed');
    expect(Application::findOrFail($id)->handover['amount'])->toBe(900000);
});

it('cancels an intake draft and prevents autosave from reviving it', function () {
    $input = [...bantuanInput(), 'draft' => true];
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/cancel', ['version' => 1, 'reason' => 'Tidak jadi mengajukan bantuan.'])->assertOk()->assertJsonPath('data.status', 'cancelled');
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'version' => 2])->assertConflict();
    expect(Application::findOrFail($id)->status)->toBe('cancelled');
});

it('lets verifiers cancel only their own drafts', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', [...bantuanInput(), 'draft' => true])->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['created_by' => $this->verifier->id])->save();
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/cancel', ['version' => 1, 'reason' => 'Tidak jadi mengajukan bantuan.'])->assertOk();
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/cancel', ['version' => 2, 'reason' => 'Tidak jadi mengajukan bantuan.'])->assertForbidden();
});

it('requires login and explicit module access, including direct API access', function () {
    $this->getJson('/api/v1/bantuan/applications')->assertUnauthorized();
    $user = new User;
    $user->forceFill(['name' => 'Other admin', 'email' => 'other@example.test', 'password_hash' => Hash::make('password-test-long'), 'is_active' => true, 'is_superadmin' => false])->save();
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/bantuan/applications')->assertForbidden();
    $this->actingAs($this->cc, 'sanctum')->getJson('/api/v1/bantuan/applications')->assertOk();
    $this->getJson('/api/v1/bantuan/settings')->assertForbidden();
    $this->postJson('/api/v1/bantuan/staff', [])->assertForbidden();
});

it('encrypts personal information and detects duplicate NIK without blocking intake', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    expect(DB::table('bantuan_applications')->where('id', $id)->value('applicant'))->not->toContain('3271051234567890');
    $this->postJson('/api/v1/bantuan/duplicate-check', ['nik' => '3271051234567890'])->assertOk()->assertJsonPath('data.count', 1);
    $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated();
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertJsonPath('data.duplicateCount', 1);
    $this->actingAs($this->verifier, 'sanctum')->getJson('/api/v1/bantuan/applications/'.$id)->assertNotFound();
    $this->getJson('/api/v1/bantuan/applications')->assertJsonCount(0, 'data');
});

it('shows same NIK application history without blocking new applications or leaking unassigned records', function () {
    $input = bantuanInput();
    $first = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $second = $this->postJson('/api/v1/bantuan/applications', [...$input, 'program' => 'Kesehatan'])->assertCreated()->json('data.id');
    $other = bantuanInput(); $other['applicant']['nik'] = '3271051234567891';
    $this->postJson('/api/v1/bantuan/applications', $other)->assertCreated();
    $this->postJson('/api/v1/bantuan/duplicate-check', ['nik' => $input['applicant']['nik'], 'excludeId' => $second])
        ->assertOk()->assertJsonPath('data.count', 1)->assertJsonCount(1, 'data.applications')->assertJsonPath('data.applications.0.id', $first);
    $this->getJson('/api/v1/bantuan/applications/'.$second)->assertOk()->assertJsonPath('data.duplicateCount', 1)->assertJsonCount(1, 'data.duplicateApplications');
    $history = $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/duplicate-check', ['nik' => $input['applicant']['nik']])
        ->assertOk()->assertJsonPath('data.count', 0)->assertJsonCount(0, 'data.applications');
    expect($history->json('data'))->not->toHaveKey('nik');
    Application::findOrFail($second)->forceFill(['verifier_id' => $this->verifier->id])->save();
    $this->getJson('/api/v1/bantuan/applications/'.$second)->assertOk()->assertJsonCount(0, 'data.duplicateApplications');
});

it('allows a completed survey without a SKTM photo even when the applicant already has SKTM', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    $survey = ['date' => now()->toDateString(), 'hasSktm' => true, 'background' => 'Latar belakang',
        'currentCondition' => 'Kondisi uji', 'needs' => 'Biaya pengobatan', 'efforts' => 'Bekerja', 'homeObservation' => 'Rumah sederhana',
        'stayDuration' => 5, 'stayUnit' => 'tahun', 'socialRecord' => 'Baik', 'recommendation' => 'layak'];
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_submit', ['version' => 1, 'survey' => $survey])->assertUnprocessable();
    foreach (['ktp', 'kk', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_submit', ['version' => 1, 'survey' => $survey])->assertOk()->assertJsonPath('data.status', 'survey_cc_review');
    expect(DB::table('bantuan_documents')->where('application_id', $id)->where('kind', 'sktm')->count())->toBe(0);
});

it('finds returning applicants by name or exact NIK and creates a separate application', function () {
    $input = bantuanInput();
    $first = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/applicants/search', ['query' => 'Pemohon'])->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $first);
    $this->postJson('/api/v1/bantuan/applicants/search', ['query' => '327105'])->assertOk()->assertJsonCount(0, 'data');
    $match = $this->postJson('/api/v1/bantuan/applicants/search', ['query' => $input['applicant']['nik']])->assertOk()->assertJsonPath('data.0.id', $first);
    expect($match->json('data.0'))->not->toHaveKey('applicant');
    expect($match->json('data.0.nikLabel'))->not->toBe($input['applicant']['nik']);
    $this->postJson('/api/v1/bantuan/applicants/search', ['query' => 'Pemohon', 'excludeId' => $first])->assertOk()->assertJsonCount(0, 'data');
    $input['applicant']['intakeType'] = 'returning';
    $input['applicant']['problem'] = 'Kebutuhan baru kali ini';
    $second = $this->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    expect($second)->not->toBe($first);
    expect(Application::findOrFail($first)->applicant['problem'])->toBe('Memerlukan biaya pengobatan');
    expect(Application::findOrFail($second)->applicant['intakeType'])->toBe('returning');
    $this->postJson('/api/v1/bantuan/applicants/search', ['query' => 'Pemohon'])->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applicants/search', ['query' => 'Pemohon'])->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/applicants/search', ['query' => 'Pemohon'])->assertForbidden();
});

it('requires private documents before submission and protects encrypted file downloads', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', [...bantuanInput(), 'source' => 'walk_in'])->json('data.id');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertUnprocessable();
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $doc = $this->post('/api/v1/bantuan/applications/'.$id.'/documents', ['kind' => 'ktp', 'file' => UploadedFile::fake()->createWithContent('ktp.png', $png)], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
    $path = DB::table('bantuan_documents')->where('id', $doc)->value('path');
    expect(Storage::disk('local')->get($path))->not->toBe($png);
    $this->get('/api/v1/bantuan/documents/'.$doc)->assertOk()->assertContent($png)->assertHeader('Cache-Control', 'no-store, private');
    $this->actingAs($this->verifier, 'sanctum')->getJson('/api/v1/bantuan/documents/'.$doc)->assertNotFound();
});

it('creates updates and submits a complete application without an assignment region', function () {
    $input = bantuanInput();
    unset($input['region']);
    $created = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)
        ->assertCreated()->assertJsonPath('data.region', '');
    $id = $created->json('data.id');
    $updated = $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'version' => 1])
        ->assertOk()->assertJsonPath('data.region', '');
    foreach (['face', 'ktp'] as $kind) bantuanDoc($id, $kind);
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => $updated->json('data.version')])
        ->assertOk()->assertJsonPath('data.status', 'review1');
});

it('creates edits and submits without collecting reporter information', function () {
    $input = bantuanInput();
    unset($input['reporter'], $input['region']);
    $created = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated();
    $id = $created->json('data.id');
    $updated = $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'version' => 1])->assertOk();
    foreach (['face', 'ktp'] as $kind) bantuanDoc($id, $kind);
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => $updated->json('data.version')])
        ->assertOk()->assertJsonPath('data.status', 'review1');
});

it('does not expose removed reporter information when editing an application', function () {
    $input = bantuanInput();
    $created = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated();
    $id = $created->json('data.id');
    unset($input['reporter']);
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'version' => 1])->assertOk();
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertOk()->assertJsonMissingPath('data.reporter');
});

it('allows WhatsApp submission without photos and stores multiple private supporting captions', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    foreach (['kk', 'supporting', 'supporting'] as $i => $kind) {
        $doc = $this->post('/api/v1/bantuan/applications/'.$id.'/documents', ['kind' => $kind, 'caption' => 'Catatan foto '.$i, 'file' => UploadedFile::fake()->createWithContent('foto.png', $png)], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        expect(DB::table('bantuan_documents')->where('id', $doc)->value('caption'))->not->toContain('Catatan foto');
    }
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertOk()->assertJsonCount(3, 'data.documents');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'review1');
    $empty = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/applications/'.$empty.'/actions/submit', ['version' => 1])->assertOk();
});

it('changes WhatsApp and walk in sources in a draft without losing documents and rechecks requirements', function () {
    $input = bantuanInput();
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $kk = bantuanDoc($id, 'kk');
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'source' => 'walk_in', 'draft' => true, 'version' => 1])->assertOk()->assertJsonPath('data.source', 'walk_in');
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertJsonPath('data.applicant.name', $input['applicant']['name'])->assertJsonPath('data.documents.0.id', $kk);
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 2])->assertUnprocessable();
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'draft' => true, 'version' => 2])->assertOk()->assertJsonPath('data.source', 'online');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 3])->assertOk();
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'source' => 'walk_in', 'version' => 4])->assertUnprocessable();
});

it('sends Call Center walk in applications to the approver before verifier assignment', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', [...bantuanInput(), 'source' => 'walk_in'])->assertCreated()->json('data.id');
    bantuanDoc($id, 'ktp');
    bantuanDoc($id, 'face');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'review1');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/assign_survey', ['version' => 2, 'surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $this->verifier->id])->assertConflict();
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/review1_approve', ['version' => 2])->assertOk()->assertJsonPath('data.status', 'survey_assignment');
});

it('removes legacy reporter storage without deleting applicants evidence or other audit details', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $doc = bantuanDoc($id, 'ktp');
    Schema::create('bantuan_reporters', function (Blueprint $table) { $table->uuid('id')->primary(); $table->text('details'); });
    Schema::table('bantuan_applications', fn (Blueprint $table) => $table->uuid('reporter_id')->nullable());
    $reporter = (string) Str::uuid();
    DB::table('bantuan_reporters')->insert(['id' => $reporter, 'details' => Crypt::encryptString('legacy reporter')]);
    DB::table('bantuan_applications')->where('id', $id)->update(['reporter_id' => $reporter]);
    DB::table('bantuan_events')->where('application_id', $id)->update(['details' => Crypt::encryptString(json_encode(['reporter' => ['name' => 'Old reporter'], 'nested' => ['reporterId' => $reporter, 'keep' => true], 'reason' => 'Keep this audit note']))]);
    $migration = require database_path('migrations/2026_10_26_000000_remove_bantuan_reporter_data.php');
    $migration->up();
    expect(Schema::hasTable('bantuan_reporters'))->toBeFalse();
    expect(Schema::hasColumn('bantuan_applications', 'reporter_id'))->toBeFalse();
    expect(Application::findOrFail($id)->applicant['name'])->toBe('Pemohon Uji');
    expect(DB::table('bantuan_documents')->where('id', $doc)->exists())->toBeTrue();
    $details = json_decode(Crypt::decryptString(DB::table('bantuan_events')->where('application_id', $id)->value('details')), true);
    expect($details)->not->toHaveKey('reporter');
    expect($details['nested'])->toBe(['keep' => true]);
    expect($details['reason'])->toBe('Keep this audit note');
});

it('saves dependent gender and validates its choices', function () {
    $input = bantuanInput();
    $input['applicant']['dependentCount'] = 1;
    $input['applicant']['dependents'] = [['name' => 'Anak Uji', 'relationship' => 'Anak', 'gender' => 'perempuan', 'age' => 12, 'status' => 'Sekolah']];
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertOk()->assertJsonPath('data.applicant.dependents.0.gender', 'perempuan');
    $input['applicant']['dependents'][0]['gender'] = 'invalid';
    $this->postJson('/api/v1/bantuan/applications', $input)->assertUnprocessable()->assertJsonValidationErrors('applicant.dependents.0.gender', 'error.details');
    $input['applicant']['dependents'][0]['gender'] = '';
    $this->postJson('/api/v1/bantuan/applications', $input)->assertUnprocessable()->assertJsonValidationErrors('applicant.dependents.0.gender', 'error.details');
});

it('only requires willingness to arrange SKTM when the applicant does not have one', function () {
    $input = bantuanInput();
    unset($input['applicant']['willingSktm']);
    $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)
        ->assertUnprocessable()->assertJsonValidationErrors('applicant.willingSktm', 'error.details');
    $input['applicant']['hasSktm'] = true;
    $id = $this->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    expect(Application::findOrFail($id)->applicant)->not->toHaveKey('willingSktm');
    $input['applicant']['hasSktm'] = false;
    $input['applicant']['willingSktm'] = false;
    $this->postJson('/api/v1/bantuan/applications', $input)->assertCreated();
});

it('completes the normal workflow only after the approved funding and mandatory evidence', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    foreach (['face', 'ktp'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $version = 1;
    $action = function ($user, $key, array $data = []) use ($id, &$version) {
        $result = $this->actingAs($user, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$key, [...$data, 'version' => $version])->assertOk();
        $version = $result->json('data.version');

        return $result;
    };
    $action($this->cc, 'submit')->assertJsonPath('data.status', 'review1');
    $action($this->approver, 'review1_approve');
    $action($this->cc, 'assign_survey', ['surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $this->verifier->id]);
    $survey = ['date' => now()->toDateString(), 'hasSktm' => false, 'sktmExplanation' => 'Sedang mengurus', 'background' => 'Latar belakang',
        'currentCondition' => 'Kondisi uji', 'needs' => 'Biaya pengobatan', 'efforts' => 'Bekerja', 'homeObservation' => 'Rumah sederhana',
        'stayDuration' => 5, 'stayUnit' => 'tahun', 'socialRecord' => 'Baik', 'recommendation' => 'layak'];
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_submit', ['version' => $version, 'survey' => $survey])->assertUnprocessable();
    foreach (['ktp', 'kk', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $action($this->verifier, 'survey_submit', ['survey' => $survey]);
    $action(bantuanUser('call_center'), 'survey_review_submit')->assertJsonPath('data.status', 'survey_submitted');
    $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/approve', ['version' => $version, 'amount' => 2500000])->assertForbidden();
    $action($this->approver, 'approve', ['amount' => 2500000]);
    $action($this->cc, 'assign_distributor', ['distributionType' => 'verifier', 'distributorId' => $this->verifier->id]);
    $action($this->fund, 'fund_submit', ['reference' => 'EXT-123']);
    $action($this->fund, 'fund_approve')->assertJsonPath('data.status', 'fund_approved');
    $this->actingAs($this->fund, 'sanctum')->getJson('/api/v1/bantuan/applications/'.$id)->assertJsonPath('data.applicant.nik', '327105xxxxxxxxxx')->assertJsonPath('data.survey', null);
    bantuanDoc($id, 'transfer');
    $action($this->treasurer, 'disburse', ['transferDate' => now()->toDateString(), 'transferAmount' => 2500000, 'account' => 'Bank uji 123']);
    $handover = ['method' => 'tunai', 'date' => now()->toDateString(), 'amount' => 2500000];
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/handover', ['version' => $version, 'handover' => $handover])->assertUnprocessable();
    foreach (['handover', 'certificate'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $action($this->verifier, 'handover', ['handover' => $handover])->assertJsonPath('data.status', 'completed');
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/approve', ['version' => $version, 'amount' => 1])->assertConflict();
    expect(DB::table('bantuan_events')->where('application_id', $id)->count())->toBeGreaterThan(10);
    expect(DB::table('bantuan_notifications')->where('user_id', $this->fund->id)->count())->toBeGreaterThan(0);
});

it('gates bypass permission and uses first-decision-wins optimistic locking', function () {
    $data = [...bantuanInput(), 'source' => 'bypass', 'bypassReason' => 'Arahan pimpinan'];
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications', $data)->assertUnprocessable();
    DB::table('bantuan_staff')->insert(['user_id' => $this->verifier->id, 'can_bypass' => true]);
    $id = $this->postJson('/api/v1/bantuan/applications', $data)->assertCreated()->json('data.id');
    foreach (['face', 'ktp'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'bypass_review');
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/approve', ['version' => 2, 'amount' => 1500000])->assertOk();
    $chair = bantuanUser('chair');
    $this->actingAs($chair, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/approve', ['version' => 2, 'amount' => 5000000])->assertConflict();
    expect(Application::find($id)->amount)->toBe(1500000);
});

it('rolls back a mass action if any item is stale and never permits self approval', function () {
    $ids = [];
    for ($i = 0; $i < 2; $i++) {
        $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
        Application::find($id)->forceFill(['status' => 'bypass_review'])->save();
        $ids[] = $id;
    }
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/batch', ['action' => 'approve', 'items' => [
        ['id' => $ids[0], 'version' => 1, 'amount' => 1000000], ['id' => $ids[1], 'version' => 99, 'amount' => 1000000]]])->assertConflict();
    foreach ($ids as $id) {
        expect(Application::find($id)->status)->toBe('bypass_review');
    }
    DB::table('bantuan_applications')->where('id', $ids[0])->update(['created_by' => $this->approver->id]);
    $this->postJson('/api/v1/bantuan/applications/'.$ids[0].'/actions/approve', ['version' => 1, 'amount' => 1000000])->assertForbidden();
});

it('saves a partial intake draft but never submits incomplete personal data', function () {
    $input = ['draft' => true, 'source' => 'online', 'program' => 'Kesehatan', 'region' => '',
        'applicant' => ['name' => 'Draft uji', 'nik' => '3271051234567890'], 'reporter' => []];
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    foreach (['face', 'ktp'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertUnprocessable();
    expect(Application::find($id)->status)->toBe('draft');
});

it('keeps an existing bypass valid after permission is revoked and prevents changing its source', function () {
    DB::table('bantuan_staff')->insert(['user_id' => $this->verifier->id, 'can_bypass' => true]);
    $input = [...bantuanInput(), 'source' => 'bypass', 'bypassReason' => 'Arahan pimpinan'];
    $id = $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    DB::table('bantuan_staff')->where('user_id', $this->verifier->id)->update(['can_bypass' => false]);
    foreach (['face', 'ktp'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk();
    $this->actingAs($this->cc, 'sanctum')->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'source' => 'online', 'version' => 2])->assertUnprocessable();
});

it('records disbursement without an optional receipt but still validates the amount', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'fund_approved', 'amount' => 1000000])->save();
    $data = ['version' => 1, 'transferDate' => now()->toDateString(), 'transferAmount' => 500000, 'account' => 'Rekening uji'];
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/disburse', $data)->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/disburse', [...$data, 'transferAmount' => 1000000])->assertOk()->assertJsonPath('data.status', 'disbursed');
    expect(DB::table('bantuan_documents')->where('application_id', $id)->where('kind', 'transfer')->count())->toBe(0);
});

it('keeps reasons mandatory and never consumes an already used optional transfer receipt again', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
    $row = Application::find($id);
    $row->forceFill(['status' => 'screening'])->save();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_reject', ['version' => 1])->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_reject', ['version' => 1, 'reason' => 'Tidak memenuhi kriteria'])->assertOk();
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertJsonPath('data.events.1.reason', 'Tidak memenuhi kriteria');
    $row->refresh()->forceFill(['status' => 'fund_approved', 'amount' => 1000000])->save();
    $doc = bantuanDoc($id, 'transfer');
    $usedAt = now()->subDay()->format('Y-m-d H:i:s');
    DB::table('bantuan_documents')->where('id', $doc)->update(['used_at' => $usedAt]);
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/disburse',
        ['version' => 2, 'transferDate' => now()->toDateString(), 'transferAmount' => 1000000, 'account' => 'Rekening uji'])->assertOk();
    expect(DB::table('bantuan_documents')->where('id', $doc)->value('used_at'))->toBe($usedAt);
});

it('sends deadline reminders at most once per recipient per day', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
    Application::find($id)->forceFill(['status' => 'disbursed', 'distributor_id' => $this->verifier->id, 'disbursed_at' => now()->subDays(10)])->save();
    $service = app(Reminders::class);
    $service->send();
    $count = DB::table('bantuan_notifications')->count();
    $service->send();
    expect(DB::table('bantuan_notifications')->count())->toBe($count)->and($count)->toBeGreaterThan(0);
});

it('warns only after the configurable survey deadline and ignores unrelated draft edits', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    DB::table('bantuan_events')->where('application_id', $id)->where('action', 'create')
        ->update(['action' => 'assign_survey', 'created_at' => now()->subDays(4)]);
    $this->actingAs(bantuanUser('admin'), 'sanctum');
    $notices = fn () => DB::table('bantuan_notifications')->where('application_id', $id)->where('message', 'like', '%Survei belum selesai%');
    app(Reminders::class)->send();
    expect($notices()->count())->toBe(0);
    DB::table('bantuan_events')->where('application_id', $id)->where('action', 'assign_survey')->update(['created_at' => now()->subDays(6)]);
    app(Reminders::class)->send();
    expect($notices()->pluck('user_id')->sort()->values()->all())->toBe(collect([$this->cc->id, $this->verifier->id])->sort()->values()->all());
    app(Reminders::class)->send();
    expect($notices()->count())->toBe(2);
    $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
    $settings['surveyReminderDays'] = 10;
    DB::table('bantuan_settings')->where('key', 'general')->update(['value' => json_encode($settings)]);
    $notices()->delete();
    app(Reminders::class)->send();
    expect($notices()->count())->toBe(0);
});

it('allows module admins and superadmins to edit and remove bantuan accounts', function (bool $superadmin) {
    $admin = bantuanUser('admin');
    if ($superadmin) $admin->forceFill(['is_superadmin' => true])->save();
    $target = bantuanUser('call_center');
    $this->actingAs($admin, 'sanctum')->putJson('/api/v1/bantuan/staff/'.$target->id, [
        'name' => 'Petugas diperbarui', 'email' => 'updated-'.Str::uuid().'@example.test',
        'password' => 'password-baru-123', 'role' => 'verifier', 'canBypass' => true, 'active' => true,
    ])->assertOk();
    $target->refresh();
    expect($target->name)->toBe('Petugas diperbarui')->and(Hash::check('password-baru-123', $target->password_hash))->toBeTrue();
    $this->deleteJson('/api/v1/bantuan/staff/'.$target->id)->assertOk()->assertJsonPath('sharedAccount', false);
    expect($target->refresh()->is_active)->toBeFalse();
    expect(DB::table('module_access')->where('user_id', $target->id)->exists())->toBeFalse();
    $this->deleteJson('/api/v1/bantuan/staff/'.$admin->id)->assertForbidden();
})->with([false, true]);

it('protects shared identities and other module access when deleting from bantuan', function () {
    $admin = bantuanUser('admin');
    $target = bantuanUser('call_center');
    $other = (string) Str::uuid();
    DB::table('modules')->insert(['id' => $other, 'slug' => 'account-test', 'name' => 'Other', 'is_active' => true]);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $target->id, 'module_id' => $other, 'role' => 'admin']);
    $data = ['role' => 'call_center', 'canBypass' => false, 'active' => true, 'name' => 'Changed identity'];
    $this->actingAs($admin, 'sanctum')->putJson('/api/v1/bantuan/staff/'.$target->id, $data)->assertForbidden();
    $admin->forceFill(['is_superadmin' => true])->save();
    $this->actingAs($admin->fresh(), 'sanctum')->putJson('/api/v1/bantuan/staff/'.$target->id, $data)->assertOk();
    $this->deleteJson('/api/v1/bantuan/staff/'.$target->id)->assertOk()->assertJsonPath('sharedAccount', true);
    expect($target->refresh()->is_active)->toBeTrue()->and($target->name)->toBe('Changed identity');
    expect(DB::table('module_access')->where('user_id', $target->id)->where('module_id', $other)->exists())->toBeTrue();
});

it('denies operational roles and protects active assignments and superadmin accounts', function () {
    $this->actingAs($this->cc, 'sanctum')->deleteJson('/api/v1/bantuan/staff/'.$this->verifier->id)->assertForbidden();
    $id = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    $admin = bantuanUser('admin');
    $this->actingAs($admin, 'sanctum')->deleteJson('/api/v1/bantuan/staff/'.$this->verifier->id)->assertConflict();
    $protected = bantuanUser('admin'); $protected->forceFill(['is_superadmin' => true])->save();
    $this->deleteJson('/api/v1/bantuan/staff/'.$protected->id)->assertForbidden();
    $this->getJson('/api/v1/bantuan/staff')->assertOk();
});

it('supports simultaneous fund requester and verifier roles with immediate revocation', function () {
    $admin = bantuanUser('admin');
    $id = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/bantuan/staff', [
        'name' => 'Petugas dua peran', 'email' => 'multi@example.test', 'password' => 'password-aman-123',
        'roles' => ['fund_requester', 'verifier'], 'canBypass' => true,
    ])->assertCreated()->json('data.id');
    $target = User::findOrFail($id);
    expect(app(\App\Modules\Bantuan\Services\Access::class)->assigned($id, 'verifier'))->toBeTrue();
    $rowId = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($rowId)->forceFill(['status' => 'survey_assignment'])->save();
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/assign_survey', ['version' => 1, 'surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $id])->assertOk();
    $this->actingAs($target, 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'fund_requester')->assertJsonPath('data.roles', ['fund_requester', 'verifier']);
    $this->getJson('/api/v1/bantuan/applications/'.$rowId)->assertOk();
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/survey_save', ['version' => 2, 'survey' => ['background' => 'Draft hasil survei.']])->assertOk();
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'verifier'])->assertOk();
    $this->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'fund_requester');
    $this->getJson('/api/v1/bantuan/applications/'.$rowId)->assertOk();
    Application::findOrFail($rowId)->forceFill(['status' => 'fund_ready', 'amount' => 1000000])->save();
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/fund_submit', ['version' => 3])->assertOk();
    expect(DB::table('bantuan_events')->where('application_id', $rowId)->where('action', 'fund_submit')->value('actor_role'))->toBe('fund_requester');
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'admin'])->assertForbidden();
    $this->actingAs($admin, 'sanctum')->putJson('/api/v1/bantuan/staff/'.$id, ['roles' => ['fund_requester'], 'active' => true, 'canBypass' => false])->assertOk();
    $this->actingAs($target, 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'fund_requester');
    $this->getJson('/api/v1/bantuan/applications/'.$rowId)->assertOk()->assertJsonPath('data.survey', null)->assertJsonPath('data.applicant.nik', '327105xxxxxxxxxx');
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/survey_save', ['version' => 4, 'survey' => []])->assertForbidden();
    Application::findOrFail($rowId)->forceFill(['amount' => null])->save();
    // Fund requesters can monitor ongoing cases, but never read private survey data.
    $this->getJson('/api/v1/bantuan/applications/'.$rowId)->assertOk()->assertJsonPath('data.survey', null)->assertJsonPath('data.applicant.nik', '327105xxxxxxxxxx');
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'verifier'])->assertForbidden();
    expect(app(\App\Modules\Bantuan\Services\Access::class)->assigned($id, 'verifier'))->toBeFalse();
});

it('ignores legacy active roles for every login token and obsolete grants after a Core change', function () {
    $user = bantuanUser('fund_requester');
    DB::table('bantuan_staff')->insert(['user_id' => $user->id, 'roles' => json_encode(['fund_requester', 'verifier']), 'can_bypass' => false]);
    $one = $user->createToken('one')->accessToken;
    $two = $user->createToken('two')->accessToken;
    DB::table('bantuan_active_roles')->insert(['session_key' => 'token:'.$one->id, 'user_id' => $user->id, 'role' => 'verifier']);
    $access = app(\App\Modules\Bantuan\Services\Access::class);
    foreach ([$one, $two] as $token) {
        $request = Illuminate\Http\Request::create('/');
        $request->setUserResolver(fn () => $user->fresh()->withAccessToken($token));
        $request->attributes->set('module_role', 'fund_requester');
        $request->attributes->set('bantuan_active_role', 'admin');
        expect($access->role($request))->toBe('fund_requester');
        expect($access->allow($request, ['verifier']))->toBe('verifier');
        expect($access->sensitive($request))->toBeTrue();
    }
    expect(\App\Modules\Bantuan\Services\Access::expandRoles('call_center', json_encode(['fund_requester', 'verifier'])))->toBe(['call_center']);
});

it('keeps secondary approver unique and prevents approving an application assigned to oneself', function () {
    DB::table('module_access')->where('user_id', $this->approver->id)->delete();
    $admin = bantuanUser('admin');
    $payload = ['name' => 'Dua peran', 'email' => 'two-roles@example.test', 'password' => 'password-aman-123', 'roles' => ['verifier', 'approver'], 'canBypass' => false];
    $id = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/bantuan/staff', $payload)->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/staff', [...$payload, 'email' => 'second@example.test'])->assertUnprocessable();
    $rowId = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($rowId)->forceFill(['status' => 'survey_submitted', 'verifier_id' => $id])->save();
    $this->actingAs(User::findOrFail($id), 'sanctum')->putJson('/api/v1/bantuan/active-role', ['role' => 'approver'])->assertOk();
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/approve', ['version' => 1, 'amount' => 1000000])->assertForbidden();
});

it('opens the Dashboard after operational login while keeping volunteer santunan scoped', function () {
    $session = new \App\Modules\Bantuan\Services\BantuanSession;
    foreach (['call_center', 'verifier', 'fund_requester', 'treasurer', 'approver', 'chair'] as $role) {
        expect($session->redirect(['moduleRoles' => ['bantuan' => $role]], null))->toBe('/admin/bantuan');
        expect($session->preferredPanel([(object) ['slug' => 'bantuan', 'role' => $role]]))->toBe('/admin/bantuan');
    }
    expect($session->redirect(['moduleRoles' => ['bantuan' => 'volunteer']], null))->toBe('/admin/bantuan/santunan');
});

it('counts only assigned work in verifier task badges while preserving scoped totals', function () {
    $first = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $second = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($first)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    Application::findOrFail($second)->forceFill(['status' => 'survey_assigned', 'created_by' => $this->verifier->id])->save();
    $this->actingAs($this->verifier, 'sanctum')->getJson('/api/v1/bantuan/dashboard')->assertOk()
        ->assertJsonPath('data.total', 2)->assertJsonPath('data.byStatus.survey_assigned', 2)
        ->assertJsonPath('data.taskCounts.survey.survey_assigned', 1);
});

it('limits account administration to this module and enforces a single approver', function () {
    $admin = bantuanUser('admin');
    $payload = ['name' => 'Verifikator baru', 'email' => 'baru@example.test', 'password' => 'password-aman-123',
        'role' => 'verifier', 'region' => 'Bandung', 'canBypass' => true, 'isSuperadmin' => true];
    $newId = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/bantuan/staff', $payload)->assertCreated()->json('data.id');
    expect(User::find($newId)->is_superadmin)->toBeFalse();
    expect(DB::table('module_access')->where('user_id', $newId)->count())->toBe(1);
    $this->postJson('/api/v1/bantuan/staff', [...$payload, 'email' => 'approver-baru@example.test', 'role' => 'approver', 'canBypass' => false])->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/staff', [...$payload, 'email' => 'treasurer-baru@example.test', 'role' => 'treasurer'])->assertUnprocessable();
    $moduleId = (string) Str::uuid();
    DB::table('modules')->insert(['id' => $moduleId, 'slug' => 'test-other', 'name' => 'Other', 'is_active' => true]);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $newId, 'module_id' => $moduleId, 'role' => 'admin']);
    $this->putJson('/api/v1/bantuan/staff/'.$newId, ['role' => 'verifier', 'canBypass' => false, 'active' => false])->assertOk();
    expect(DB::table('module_access')->where('user_id', $newId)->where('module_id', $moduleId)->exists())->toBeTrue()
        ->and(User::find($newId)->is_active)->toBeTrue();
});

it('validates grouped transfers and atomically records every recipient for the same verifier', function () {
    $items = [];
    foreach ([1000000, 2000000] as $amount) {
        $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
        Application::find($id)->forceFill(['amount' => $amount, 'status' => 'fund_approved', 'distribution_type' => 'verifier', 'distributor_id' => $this->verifier->id])->save();
        bantuanDoc($id, 'transfer');
        $items[] = ['id' => $id, 'version' => 1, 'transferAmount' => $amount];
    }
    $payload = ['action' => 'disburse', 'items' => $items, 'totalAmount' => 100, 'transferDate' => now()->toDateString(), 'account' => 'Bank uji'];
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/batch', $payload)->assertUnprocessable();
    foreach ($items as $item) expect(Application::find($item['id'])->status)->toBe('fund_approved');
    $this->postJson('/api/v1/bantuan/batch', [...$payload, 'totalAmount' => 3000000])->assertOk()->assertJsonCount(2, 'data');
    foreach ($items as $item) expect(Application::find($item['id'])->status)->toBe('disbursed');
});

it('permits draft surveys without photos but does not submit incomplete surveys', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
    Application::find($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_save',
        ['version' => 1, 'survey' => ['background' => 'Catatan kunjungan sementara']])->assertOk()->assertJsonPath('data.status', 'survey_assigned');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_submit', ['version' => 2, 'survey' => []])->assertUnprocessable();
});

it('records routine and non-routine santunan from transfer through volunteer report', function (string $frequency, bool $receipt) {
    $volunteer = bantuanUser('volunteer');
    $otherVolunteer = bantuanUser('volunteer');
    $payload = ['frequency' => $frequency, 'category' => $frequency === 'routine' ? 'widow' : 'orphan', 'period' => now()->format('Y-m'),
        'recipientName' => 'Penerima Santunan', 'volunteerId' => $volunteer->id, 'amount' => 300000];

    $id = $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan', $payload)
        ->assertCreated()->assertJsonPath('data.transferStatus', 'pending')->json('data.id');
    $this->actingAs($volunteer, 'sanctum')->getJson('/api/v1/bantuan/santunan')->assertJsonCount(1, 'data');
    $this->actingAs($otherVolunteer, 'sanctum')->getJson('/api/v1/bantuan/santunan')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/bantuan/applications')->assertJsonCount(0, 'data');
    $this->actingAs($volunteer, 'sanctum')->postJson('/api/v1/bantuan/santunan/'.$id.'/complete', [
        'version' => 1, 'distributionDate' => now()->toDateString(), 'location' => 'Bandung',
        'recipient' => 'Penerima Santunan', 'description' => 'Santunan telah diserahkan.',
    ])->assertStatus(409);

    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan/'.$id.'/transferred', [
        'version' => 1, 'transferredAt' => now()->toDateString(),
    ])->assertOk()->assertJsonPath('data.transferStatus', 'transferred');

    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $this->actingAs($volunteer, 'sanctum')->post('/api/v1/bantuan/santunan/'.$id.'/documents', [
        'kind' => 'aid_paper', 'file' => UploadedFile::fake()->createWithContent('kertas.png', $png),
    ], ['Accept' => 'application/json'])->assertCreated();
    if ($receipt) {
        $receiptId = $this->post('/api/v1/bantuan/santunan/'.$id.'/documents', [
            'kind' => 'transfer_receipt', 'file' => UploadedFile::fake()->createWithContent('transfer.png', $png),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $this->get('/api/v1/bantuan/santunan-documents/'.$receiptId)->assertOk()->assertContent($png);
        $this->actingAs($otherVolunteer, 'sanctum')->get('/api/v1/bantuan/santunan-documents/'.$receiptId)->assertNotFound();
        $this->actingAs($volunteer, 'sanctum')->post('/api/v1/bantuan/santunan/'.$id.'/documents', [
            'kind' => 'transfer_receipt', 'file' => UploadedFile::fake()->createWithContent('duplikat.png', $png),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }
    $this->postJson('/api/v1/bantuan/santunan/'.$id.'/complete', [
        'version' => 2, 'distributionDate' => now()->toDateString(), 'location' => 'Bandung',
        'recipient' => 'Penerima Santunan', 'description' => 'Santunan telah diserahkan.',
    ])->assertUnprocessable();
    $photoId = $this->post('/api/v1/bantuan/santunan/'.$id.'/documents', [
        'kind' => 'recipient_photo', 'file' => UploadedFile::fake()->createWithContent('bersama.png', $png),
    ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/santunan/'.$id.'/complete', [
        'version' => 2, 'distributionDate' => now()->toDateString(), 'location' => 'Bandung',
        'recipient' => 'Penerima Santunan', 'description' => 'Santunan telah diserahkan.',
    ])->assertOk()->assertJsonPath('data.distributionStatus', 'completed');
    $this->get('/api/v1/bantuan/santunan-documents/'.$photoId)->assertOk()->assertContent($png);

    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan', [
        ...$payload, 'frequency' => 'non_routine', 'category' => 'widow', 'recipientName' => 'Penerima Lain',
    ])->assertUnprocessable();
})->with([['routine', false], ['routine', true], ['non_routine', false], ['non_routine', true]]);

it('combines detailed application filters and exports exactly the filtered report', function () {
    $target = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $other = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::find($target)->forceFill(['status' => 'completed', 'amount' => 3500000, 'verifier_id' => $this->verifier->id,
        'distributor_id' => $this->verifier->id, 'distribution_type' => 'verifier', 'created_at' => '2026-10-02 08:00:00',
        'disbursed_at' => '2026-10-08 08:00:00', 'completed_at' => '2026-10-09 08:00:00', 'handover' => ['amount' => 3400000]])->save();
    Application::find($other)->forceFill(['status' => 'completed', 'amount' => 1000000, 'program' => 'Pendidikan', 'region' => 'Jakarta'])->save();
    $filters = ['program' => 'Kesehatan', 'status' => 'completed', 'source' => 'online', 'region' => 'Bandung',
        'dateField' => 'completed', 'from' => '2026-10-01', 'to' => '2026-10-31', 'surveyAddress' => 'Jalan Lokasi Survei 10, Bogor', 'verifierId' => $this->verifier->id,
        'distributorId' => $this->verifier->id, 'createdBy' => $this->cc->id, 'amountState' => 'set', 'distributionType' => 'verifier',
        'amountMin' => '3000000', 'amountMax' => '4000000', 'perPage' => '12', 'sort' => 'amount_high', 'summary' => '1'];
    $this->actingAs($this->approver, 'sanctum')->getJson('/api/v1/bantuan/applications?'.http_build_query($filters))
        ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('per_page', 12)->assertJsonPath('data.0.id', $target)
        ->assertJsonPath('summary.total', 1)->assertJsonPath('summary.completedAmount', 3400000)->assertJsonPath('summary.disbursedAmount', 3500000);
    $csv = $this->get('/api/v1/bantuan/export?'.http_build_query($filters))->assertOk()->streamedContent();
    expect($csv)->toContain(Application::find($target)->number)->not->toContain(Application::find($other)->number);
    $this->getJson('/api/v1/bantuan/dashboard?'.http_build_query(['program' => 'Kesehatan', 'from' => '2026-10-01', 'to' => '2026-10-31']))
        ->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.byStatus.completed', 1);
});

it('paginates and sorts the complete filtered result and supports unassigned or missing amounts', function () {
    $first = null;
    for ($i = 1; $i <= 14; $i++) {
        $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
        Application::find($id)->forceFill(['amount' => $i * 100000, 'created_at' => now()->subDays(15 - $i)])->save();
        if ($i === 1) $first = $id;
    }
    $page1 = $this->getJson('/api/v1/bantuan/applications?perPage=12&sort=amount_low&verifierId=unassigned')->assertOk()
        ->assertJsonPath('total', 14)->assertJsonPath('last_page', 2)->assertJsonCount(12, 'data')->assertJsonPath('data.0.id', $first)->json('data');
    $page2 = $this->getJson('/api/v1/bantuan/applications?perPage=12&page=2&sort=amount_low&verifierId=unassigned')->assertOk()->assertJsonCount(2, 'data')->json('data');
    expect(array_intersect(array_column($page1, 'id'), array_column($page2, 'id')))->toBe([]);
    Application::find($first)->forceFill(['amount' => null])->save();
    $this->getJson('/api/v1/bantuan/applications?amountState=unset')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $first);
    $this->getJson('/api/v1/bantuan/applications?dateField=completed&from=2026-01-01')->assertOk()->assertJsonPath('total', 0);
});

it('validates detailed filters and never widens verifier scope through status search or staff filters', function () {
    $other = bantuanUser('verifier');
    $own = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $hidden = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::find($own)->forceFill(['status' => 'disbursed', 'amount' => 500000, 'distributor_id' => $this->verifier->id, 'disbursed_at' => now()->subDays(30)])->save();
    Application::find($hidden)->forceFill(['status' => 'disbursed', 'amount' => 900000, 'distributor_id' => $other->id, 'region' => 'Wilayah Privat', 'disbursed_at' => now()->subDays(30)])->save();
    $response = $this->actingAs($this->verifier, 'sanctum')->getJson('/api/v1/bantuan/applications?task=distribution&distributorId=me&overdue=1&summary=1')->assertOk()
        ->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $own)->assertJsonPath('summary.total', 1);
    expect($response->json('filterOptions.regions'))->not->toContain('Wilayah Privat');
    $this->getJson('/api/v1/bantuan/applications?distributorId='.$other->id)->assertOk()->assertJsonPath('total', 0);
    $this->getJson('/api/v1/bantuan/applications?states=disbursed&status=draft')->assertOk()->assertJsonPath('total', 0);
    foreach (['from=2026-10-28&to=2026-10-01', 'amountMin=200&amountMax=100', 'amountMin=-1', 'perPage=10000', 'sort=amount%20DESC%3B--', 'dateField=unknown'] as $filter) {
        $this->getJson('/api/v1/bantuan/applications?'.$filter)->assertUnprocessable();
    }
});

it('unions application visibility without widening subsequent filters', function (array $roles, array $visible, bool $sensitive) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    $ids = [];
    foreach (['own', 'survey', 'distribution', 'finance', 'hidden'] as $name) {
        $ids[$name] = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    }
    Application::findOrFail($ids['own'])->forceFill(['created_by' => $user->id])->save();
    Application::findOrFail($ids['survey'])->forceFill(['verifier_id' => $user->id])->save();
    Application::findOrFail($ids['distribution'])->forceFill(['distributor_id' => $user->id])->save();
    Application::findOrFail($ids['finance'])->forceFill(['amount' => 500000])->save();
    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/bantuan/applications?summary=1')->assertOk()
        ->assertJsonPath('total', count($visible))->assertJsonPath('summary.total', count($visible));
    expect($response->json('data.*.id'))->toEqualCanonicalizing(array_map(fn ($name) => $ids[$name], $visible));
    $this->getJson('/api/v1/bantuan/dashboard')->assertJsonPath('data.total', count($visible));
    $this->getJson('/api/v1/bantuan/applications?status=completed&search=Pemohon')->assertJsonPath('total', 0);
    foreach ($ids as $name => $id) {
        $detail = $this->getJson('/api/v1/bantuan/applications/'.$id);
        if (! in_array($name, $visible, true)) { $detail->assertNotFound(); continue; }
        $private = $sensitive && ($name !== 'finance' || array_intersect($roles, ['admin', 'call_center', 'approver', 'chair']));
        $detail->assertOk()->assertJsonPath('data.applicant.nik', $private ? '3271051234567890' : '327105xxxxxxxxxx');
        $detail->assertJsonPath('data.duplicateCount', count($visible) - 1)->assertJsonCount(count($visible) - 1, 'data.duplicateApplications');
    }
})->with([
    'requester plus finance' => [['requester', 'fund_requester'], ['own', 'finance'], true],
    'finance plus verifier' => [['fund_requester', 'verifier'], ['own', 'survey', 'distribution', 'finance'], true],
    'verifier plus finance' => [['verifier', 'fund_requester'], ['own', 'survey', 'distribution', 'finance'], true],
    'volunteer only' => [['volunteer'], [], false],
    'volunteer plus verifier' => [['volunteer', 'verifier'], ['own', 'survey', 'distribution'], true],
    'volunteer plus finance stays masked' => [['volunteer', 'treasurer'], ['finance'], false],
    'secondary call center' => [['requester', 'call_center'], ['own', 'survey', 'distribution', 'finance', 'hidden'], true],
    'secondary chair' => [['volunteer', 'chair'], ['own', 'survey', 'distribution', 'finance', 'hidden'], true],
]);

it('selects intake actors by source and keeps their provenance immutable', function (array $roles, string $source, string $actor, string $stage) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles, true);
    $input = [...bantuanInput(), 'source' => $source, 'bypassReason' => 'Penanganan segera dibutuhkan.', 'intakeRole' => 'admin', 'role' => 'admin'];
    $id = $this->actingAs($user, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()
        ->assertJsonPath('data.intakeRole', $actor)->json('data.id');
    expect(DB::table('bantuan_events')->where('application_id', $id)->where('action', 'create')->value('actor_role'))->toBe($actor);
    $this->putJson('/api/v1/bantuan/active-role', ['role' => $roles[0]])->assertOk();
    $this->putJson('/api/v1/bantuan/applications/'.$id, [...$input, 'version' => 1])->assertOk()->assertJsonPath('data.intakeRole', $actor);
    if ($source !== 'online') { bantuanDoc($id, 'face'); bantuanDoc($id, 'ktp'); }
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 2])->assertOk()
        ->assertJsonPath('data.status', $stage)->assertJsonPath('data.intakeRole', $actor);
    expect(DB::table('bantuan_events')->where('application_id', $id)->where('action', 'submit')->value('actor_role'))->toBe($actor);
})->with([
    'verifier requester normal' => [['verifier', 'requester'], 'online', 'requester', 'review1'],
    'requester verifier normal' => [['requester', 'verifier'], 'online', 'requester', 'review1'],
    'requester verifier bypass' => [['requester', 'verifier'], 'bypass', 'verifier', 'bypass_review'],
    'verifier requester bypass' => [['verifier', 'requester'], 'bypass', 'verifier', 'bypass_review'],
    'call center wins normal' => [['requester', 'call_center'], 'online', 'call_center', 'review1'],
    'call center wins walk in' => [['verifier', 'requester', 'call_center'], 'walk_in', 'call_center', 'review1'],
    'call center wins bypass' => [['requester', 'verifier', 'call_center'], 'bypass', 'call_center', 'bypass_review'],
]);

it('selects the request data actor for its review stage', function (array $roles) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    foreach (['screening' => 'call_center', 'review1' => 'approver'] as $status => $actor) {
        Application::findOrFail($id)->forceFill(['status' => $status])->save();
        $version = Application::findOrFail($id)->version;
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/request_data', [
            'version' => $version, 'reason' => 'Lengkapi data pada tahap ini.', 'role' => 'admin',
        ])->assertOk()->assertJsonPath('data.status', 'needs_data');
        expect(DB::table('bantuan_events')->where('application_id', $id)->where('action', 'request_data')->where('from_status', $status)->value('actor_role'))->toBe($actor);
    }
})->with([
    [['approver', 'call_center']],
    [['call_center', 'approver']],
]);

it('selects the delivery actor for its distribution context and keeps assignment checks', function (array $roles, string $type, string $action) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'disbursed', 'distribution_type' => $type, 'distributor_id' => $this->verifier->id, 'amount' => 500000])->save();
    $input = ['version' => 1, 'reason' => 'Penerima tidak dapat ditemui.',
        'handover' => ['method' => 'tunai', 'date' => now()->toDateString(), 'amount' => 500000]];
    bantuanDoc($id, 'handover'); bantuanDoc($id, 'certificate');
    $this->actingAs($user, 'sanctum');
    if ($type === 'verifier') {
        $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$action, $input)->assertForbidden();
        Application::findOrFail($id)->forceFill(['distributor_id' => $user->id])->save();
    }
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$action, $input)->assertOk()
        ->assertJsonPath('data.status', $action === 'handover' ? 'completed' : 'delivery_failed');
    expect(DB::table('bantuan_events')->where('application_id', $id)->where('action', $action)->value('actor_role'))->toBe($type === 'direct' ? 'treasurer' : 'verifier');
})->with([
    [['verifier', 'treasurer'], 'direct', 'handover'],
    [['treasurer', 'verifier'], 'direct', 'handover'],
    [['verifier', 'treasurer'], 'verifier', 'handover'],
    [['treasurer', 'verifier'], 'verifier', 'handover'],
    [['verifier', 'treasurer'], 'direct', 'delivery_fail'],
    [['treasurer', 'verifier'], 'verifier', 'delivery_fail'],
]);

it('uses every document permission while preserving ownership assignment and evidence locks', function (array $roles) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $upload = fn (string $kind) => $this->post('/api/v1/bantuan/applications/'.$id.'/documents', [
        'kind' => $kind, 'file' => UploadedFile::fake()->createWithContent('foto.png', $png),
    ], ['Accept' => 'application/json']);
    $this->actingAs($user, 'sanctum');
    Application::findOrFail($id)->forceFill(['amount' => 500000, 'status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    $upload('survey_front')->assertForbidden();
    Application::findOrFail($id)->forceFill(['verifier_id' => $user->id])->save();
    $doc = $upload('survey_front')->assertCreated()->json('data.id');
    $this->get('/api/v1/bantuan/documents/'.$doc)->assertOk()->assertContent($png);
    $this->deleteJson('/api/v1/bantuan/documents/'.$doc)->assertOk();
    expect(DB::table('bantuan_events')->where('application_id', $id)->where('action', 'remove_document')->value('actor_role'))->toBe('verifier');
    Application::findOrFail($id)->forceFill(['status' => 'fund_approved'])->save();
    $doc = $upload('transfer')->assertCreated()->json('data.id');
    DB::table('bantuan_documents')->where('id', $doc)->update(['uploaded_by' => $this->treasurer->id]);
    $this->deleteJson('/api/v1/bantuan/documents/'.$doc)->assertForbidden();
    DB::table('bantuan_documents')->where('id', $doc)->update(['uploaded_by' => $user->id]);
    $this->deleteJson('/api/v1/bantuan/documents/'.$doc)->assertOk();
    Application::findOrFail($id)->forceFill(['status' => 'disbursed', 'distribution_type' => 'direct'])->save();
    $doc = $upload('handover')->assertCreated()->json('data.id');
    $this->deleteJson('/api/v1/bantuan/documents/'.$doc)->assertOk();
    $doc = $upload('certificate')->assertCreated()->json('data.id');
    DB::table('bantuan_documents')->where('id', $doc)->update(['used_at' => now()]);
    $this->deleteJson('/api/v1/bantuan/documents/'.$doc)->assertConflict();
    expect(DB::table('bantuan_events')->where('application_id', $id)->where('action', 'upload_document')->where('actor_role', 'treasurer')->count())->toBe(3);
})->with([
    [['verifier', 'treasurer']],
    [['treasurer', 'verifier']],
]);

it('matches task lists and badges to the union of verifier call center admin and treasurer grants', function (array $roles, int $surveyCount, int $distributionCount) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    foreach (['assigned', 'own', 'other'] as $name) {
        $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
        Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'amount' => 500000,
            'created_by' => $name === 'own' ? $user->id : $this->cc->id,
            'verifier_id' => $name === 'assigned' ? $user->id : $this->verifier->id,
            'distributor_id' => $name === 'assigned' ? $user->id : $this->verifier->id])->save();
    }
    $this->actingAs($user, 'sanctum');
    foreach (['survey' => $surveyCount, 'distribution' => $distributionCount] as $task => $count) {
        $this->getJson('/api/v1/bantuan/applications?task='.$task.'&summary=1')->assertOk()->assertJsonPath('total', $count)->assertJsonPath('summary.total', $count);
        $this->getJson('/api/v1/bantuan/dashboard')->assertOk()->assertJsonPath('data.taskCounts.'.$task.'.survey_assigned', $count);
    }
})->with([
    'secondary verifier restricts both' => [['fund_requester', 'verifier'], 1, 1],
    'treasurer retains assigned distribution' => [['verifier', 'treasurer'], 1, 1],
    'secondary verifier retains assigned distribution' => [['treasurer', 'verifier'], 1, 1],
    'secondary call center retains own field tasks' => [['verifier', 'call_center'], 1, 1],
    'admin frees both' => [['admin', 'verifier'], 3, 3],
]);

it('unions santunan visibility and actions while retaining volunteer assignments', function (array $roles, int $count) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    $volunteer = bantuanUser('volunteer');
    $input = ['frequency' => 'routine', 'category' => 'widow', 'period' => now()->format('Y-m'), 'recipientName' => 'Penerima', 'amount' => 300000];
    $ids = [];
    foreach ([$user->id, $volunteer->id] as $volunteerId) {
        $ids[] = $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan', [...$input, 'volunteerId' => $volunteerId])->assertCreated()->json('data.id');
    }
    $this->postJson('/api/v1/bantuan/santunan/'.$ids[0].'/transferred', ['version' => 1, 'transferredAt' => now()->toDateString()])->assertOk();
    $this->postJson('/api/v1/bantuan/santunan/'.$ids[1].'/transferred', ['version' => 1, 'transferredAt' => now()->toDateString()])->assertOk();
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/bantuan/santunan')->assertOk()->assertJsonCount($count, 'data');
    if (in_array('treasurer', $roles, true)) {
        $this->postJson('/api/v1/bantuan/santunan', [...$input, 'volunteerId' => $volunteer->id])->assertCreated();
    }
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    foreach (['aid_paper', 'recipient_photo'] as $kind) {
        $doc = $this->post('/api/v1/bantuan/santunan/'.$ids[0].'/documents', ['kind' => $kind, 'file' => UploadedFile::fake()->createWithContent('foto.png', $png)], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $this->get('/api/v1/bantuan/santunan-documents/'.$doc)->assertOk()->assertContent($png);
    }
    $report = ['version' => 2, 'distributionDate' => now()->toDateString(), 'location' => 'Bandung', 'recipient' => 'Penerima', 'description' => 'Santunan telah diserahkan.'];
    $this->postJson('/api/v1/bantuan/santunan/'.$ids[1].'/complete', $report)->assertStatus($count === 1 ? 404 : 403);
    $this->postJson('/api/v1/bantuan/santunan/'.$ids[0].'/complete', $report)->assertOk()->assertJsonPath('data.distributionStatus', 'completed');
    expect(DB::table('bantuan_santunan_events')->where('santunan_id', $ids[0])->where('action', 'completed')->value('actor_role'))->toBe('volunteer');
})->with([
    [['treasurer', 'volunteer'], 2],
    [['volunteer', 'treasurer'], 2],
    [['chair', 'volunteer'], 2],
    [['verifier', 'volunteer'], 1],
]);

it('exposes the module launcher only for superadmins or an admin of any module', function () {
    $this->actingAs($this->cc, 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertOk()->assertJsonPath('data.canChooseModules', false);
    $module = (string) Str::uuid();
    DB::table('modules')->insert(['id' => $module, 'slug' => 'launcher-test', 'name' => 'Other', 'is_active' => true]);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'module_id' => $module, 'user_id' => $this->cc->id, 'role' => 'editor']);
    $this->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.canChooseModules', false);
    DB::table('module_access')->where('module_id', $module)->update(['role' => 'admin']);
    $this->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.canChooseModules', true);
    $admin = bantuanUser('admin');
    $this->actingAs($admin, 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.canChooseModules', true);
    $admin->forceFill(['is_superadmin' => true])->save();
    DB::table('module_access')->where('user_id', $admin->id)->delete();
    $this->actingAs($admin->fresh(), 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.canChooseModules', true)->assertJsonPath('data.roles', ['admin']);
});

it('keeps private data documents and NIK searches scoped to the role that grants sensitive access', function (array $roles) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles);
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $ids = []; $docs = [];
    foreach (['own', 'foreign'] as $name) {
        $input = bantuanInput();
        if ($name === 'foreign') $input['applicant']['nik'] = '3271051234567891';
        $ids[$name] = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
        $docs[$name] = $this->post('/api/v1/bantuan/applications/'.$ids[$name].'/documents', [
            'kind' => 'ktp', 'file' => UploadedFile::fake()->createWithContent('foto.png', $png),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        Application::findOrFail($ids[$name])->forceFill(['amount' => 500000, 'survey' => ['background' => 'Informasi rahasia.'],
            'created_by' => $name === 'own' ? $user->id : $this->cc->id])->save();
    }
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/bantuan/applications/'.$ids['own'])->assertOk()
        ->assertJsonPath('data.applicant.nik', '3271051234567890')->assertJsonPath('data.survey.background', 'Informasi rahasia.')->assertJsonCount(1, 'data.documents');
    $this->get('/api/v1/bantuan/documents/'.$docs['own'])->assertOk()->assertContent($png);
    $this->getJson('/api/v1/bantuan/applications/'.$ids['foreign'])->assertOk()->assertJsonPath('data.applicant.nik', '327105xxxxxxxxxx')
        ->assertJsonPath('data.survey', null)->assertJsonCount(0, 'data.documents');
    $this->get('/api/v1/bantuan/documents/'.$docs['foreign'], ['Accept' => 'application/json'])->assertForbidden();
    $this->getJson('/api/v1/bantuan/applications?search=3271051234567891')->assertOk()->assertJsonPath('total', 0);
    $this->get('/api/v1/bantuan/export?search=3271051234567891')->assertOk()->assertStreamedContent("\xEF\xBB\xBFNomor,Nama,Program,Wilayah,Jalur,Status,Nominal,Tanggal\n");
    $this->postJson('/api/v1/bantuan/applicants/search', ['query' => '3271051234567891'])->assertOk()->assertJsonCount(0, 'data');
    $this->postJson('/api/v1/bantuan/applicants/search', ['query' => 'Pemohon'])->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ids['own']);
    if (in_array('verifier', $roles, true)) {
        Application::findOrFail($ids['foreign'])->forceFill(['verifier_id' => $user->id])->save();
        $this->getJson('/api/v1/bantuan/applications/'.$ids['foreign'])->assertJsonPath('data.applicant.nik', '3271051234567891')->assertJsonCount(1, 'data.documents');
        $this->get('/api/v1/bantuan/documents/'.$docs['foreign'])->assertOk();
        $this->getJson('/api/v1/bantuan/applications?search=3271051234567891')->assertJsonPath('total', 1);
        Application::findOrFail($ids['foreign'])->forceFill(['verifier_id' => null, 'distributor_id' => $user->id])->save();
        $this->getJson('/api/v1/bantuan/applications/'.$ids['foreign'])->assertJsonPath('data.applicant.nik', '3271051234567891');
        Application::findOrFail($ids['foreign'])->forceFill(['distributor_id' => null])->save();
        $this->get('/api/v1/bantuan/documents/'.$docs['foreign'], ['Accept' => 'application/json'])->assertForbidden();
    }
})->with([
    [['fund_requester', 'verifier']],
    [['verifier', 'treasurer']],
    [['fund_requester', 'requester']],
    [['requester', 'treasurer']],
]);

it('authorizes intake edits submissions cancellations and photos per owned row even with finance visibility', function (array $roles, string $source, string $actor) {
    $user = bantuanUser($roles[0]);
    bantuanRoles($user, $roles, true);
    $input = [...bantuanInput(), 'source' => $source, 'bypassReason' => 'Penanganan segera dibutuhkan.'];
    $own = $this->actingAs($user, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    if ($source === 'bypass') bantuanRoles($this->cc, ['call_center'], true);
    $foreign = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    Application::findOrFail($foreign)->forceFill(['amount' => 500000])->save();
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/bantuan/applications/'.$foreign)->assertOk();
    $this->putJson('/api/v1/bantuan/applications/'.$foreign, [...$input, 'version' => 1])->assertForbidden();
    $this->postJson('/api/v1/bantuan/applications/'.$foreign.'/actions/submit', ['version' => 1])->assertForbidden();
    $this->postJson('/api/v1/bantuan/applications/'.$foreign.'/actions/cancel', ['version' => 1, 'reason' => 'Tidak jadi diajukan.'])->assertForbidden();
    $this->deleteJson('/api/v1/bantuan/applications/'.$foreign, ['version' => 1])->assertForbidden();
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $this->post('/api/v1/bantuan/applications/'.$foreign.'/documents', ['kind' => 'ktp', 'file' => UploadedFile::fake()->createWithContent('foto.png', $png)], ['Accept' => 'application/json'])->assertForbidden();
    $this->putJson('/api/v1/bantuan/applications/'.$own, [...$input, 'version' => 1, 'intakeRole' => 'call_center'])->assertOk()->assertJsonPath('data.intakeRole', $actor);
    expect(DB::table('bantuan_events')->where('application_id', $own)->where('action', 'edit_intake')->value('actor_role'))->toBe($actor);
    Application::findOrFail($own)->forceFill(['status' => $actor === 'requester' ? 'screening' : 'bypass_review'])->save();
    $this->putJson('/api/v1/bantuan/applications/'.$own, [...$input, 'version' => 2])->assertStatus($actor === 'requester' ? 403 : 409);
    Application::findOrFail($own)->forceFill(['status' => 'needs_data'])->save();
    $this->putJson('/api/v1/bantuan/applications/'.$own, [...$input, 'version' => 2])->assertOk();
})->with([
    [['fund_requester', 'requester'], 'online', 'requester'],
    [['requester', 'fund_requester'], 'online', 'requester'],
    [['fund_requester', 'verifier'], 'bypass', 'verifier'],
    [['verifier', 'fund_requester'], 'bypass', 'verifier'],
]);

it('preserves self review safeguards across simultaneous operational grants', function (string $relationship) {
    $user = bantuanUser('call_center');
    bantuanRoles($user, ['call_center', 'approver', 'verifier']);
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill([$relationship => $user->id, 'status' => 'review1'])->save();
    $this->actingAs($user, 'sanctum');
    foreach (['review1_approve', 'review1_reject'] as $action) {
        $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$action, ['version' => 1, 'reason' => 'Alasan review lengkap.'])->assertForbidden();
    }
    Application::findOrFail($id)->forceFill(['status' => 'survey_submitted'])->save();
    foreach (['approve', 'review_reject', 'survey_again'] as $action) {
        $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/'.$action, ['version' => 1, 'amount' => 500000, 'reason' => 'Alasan review lengkap.', 'role' => 'admin'])->assertForbidden();
    }
    expect(Application::findOrFail($id)->version)->toBe(1);
})->with(['created_by', 'verifier_id']);

it('filters audit records across the entire log and preserves management access', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $number = Application::find($id)->number;
    $this->getJson('/api/v1/bantuan/audit')->assertForbidden();
    $admin = bantuanUser('admin');
    $this->actingAs($admin, 'sanctum')->getJson('/api/v1/bantuan/audit?'.http_build_query(['search' => $number, 'role' => 'call_center', 'action' => 'create', 'from' => now()->toDateString()]))
        ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.applicationNumber', $number)->assertJsonPath('data.0.actorName', $this->cc->name);
    $this->getJson('/api/v1/bantuan/audit?role=treasurer')->assertOk()->assertJsonPath('total', 0);
});


it('requires online identity documents only when sending survey and permits the assigned verifier to upload them', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status' => 'survey_assigned', 'verifier_id' => $this->verifier->id])->save();
    foreach (['survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    $url = '/api/v1/bantuan/applications/'.$id;
    $this->actingAs($this->verifier, 'sanctum')->postJson($url.'/actions/survey_save', ['version' => 1, 'survey' => bantuanSurvey()])->assertOk();
    $this->postJson($url.'/actions/survey_submit', ['version' => 2, 'survey' => bantuanSurvey()])->assertUnprocessable();
    expect(Application::findOrFail($id)->status)->toBe('survey_assigned');
    $access = app(\App\Modules\Bantuan\Services\Access::class);
    $request = \Illuminate\Http\Request::create('/');
    $request->setUserResolver(fn () => $this->verifier);
    $request->attributes->set('module_role', 'verifier');
    foreach (['ktp', 'kk'] as $kind) {
        expect($access->documentRole($request, Application::findOrFail($id), $kind))->toBe('verifier');
        bantuanDoc($id, $kind);
    }
    $this->postJson($url.'/actions/survey_submit', ['version' => 2, 'survey' => bantuanSurvey()])->assertOk()->assertJsonPath('data.status', 'survey_cc_review');
});

it('requires a detailed bypass assessment but no photos on submission', function () {
    bantuanRoles($this->verifier, ['verifier'], true);
    $input = [...bantuanInput(), 'source' => 'bypass', 'bypassReason' => 'Kondisi sudah diperiksa langsung'];
    unset($input['applicant']['bypassNeeds']);
    $id = $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $url = '/api/v1/bantuan/applications/'.$id;
    $this->postJson($url.'/actions/submit', ['version' => 1])->assertUnprocessable();
    $input['applicant']['bypassNeeds'] = 'Biaya obat Rp500.000 berdasarkan resep.';
    $this->putJson($url, [...$input, 'version' => 1])->assertOk();
    $this->postJson($url.'/actions/submit', ['version' => 2])->assertOk()->assertJsonPath('data.status', 'bypass_review');
    expect(DB::table('bantuan_documents')->where('application_id', $id)->count())->toBe(0);
});


it('accepts optional reporter and address details and preserves workflow during CC corrections', function () {
    $input=bantuanInput();
    foreach(['rtRw','city','district','village'] as $key)unset($input['applicant'][$key]);
    $input['applicant']['reporterName']='Istri pemohon';
    $input['applicant']['reporterPhone']='081234567890';
    $input['applicant']['assessment_background']='Hasil wawancara awal';
    $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',$input)->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status'=>'fund_approved','amount'=>2500000,'verifier_id'=>$this->verifier->id,'distributor_id'=>$this->verifier->id])->save();
    $input['applicant']['problem']='Keterangan diperbaiki oleh Call Center';
    $this->putJson('/api/v1/bantuan/applications/'.$id,[...$input,'version'=>1])->assertOk()->assertJsonPath('data.status','fund_approved');
    $row=Application::findOrFail($id);
    expect($row->amount)->toBe(2500000)->and($row->distributor_id)->toBe($this->verifier->id)->and($row->applicant['reporterName'])->toBe('Istri pemohon');
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertOk()->assertJsonPath('data.applicant.assessment_background','Hasil wawancara awal');
    $this->actingAs($this->verifier,'sanctum')->putJson('/api/v1/bantuan/applications/'.$id,[...$input,'version'=>2])->assertForbidden();
});

it('automatically assigns the survey verifier as distributor after amount approval', function () {
    $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status'=>'survey_submitted','verifier_id'=>$this->verifier->id])->save();
    $this->actingAs($this->approver,'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/approve',['version'=>1,'amount'=>1200000])->assertOk()->assertJsonPath('data.status','fund_ready')->assertJsonPath('data.distributorId',$this->verifier->id);
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->where('user_id',$this->fund->id)->exists())->toBeTrue();
});

it('limits full report to admin and includes validated filter and private applicant fields',function(){
    $input=bantuanInput();$input['applicant']['reporterName']='Pelapor uji';
    $this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',$input)->assertCreated();
    $this->getJson('/api/v1/bantuan/reports/full')->assertForbidden();
    $this->actingAs(bantuanUser('admin'),'sanctum')->getJson('/api/v1/bantuan/reports/full?status=draft')->assertOk()->assertJsonCount(1,'data')->assertJsonPath('data.0.reporterName','Pelapor uji');
    $this->getJson('/api/v1/bantuan/reports/full?status=completed')->assertOk()->assertJsonCount(0,'data');
});


it('prepares an overdue survey WhatsApp reminder only for the responsible CC and verifier',function(){
    $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status'=>'survey_assigned','verifier_id'=>$this->verifier->id])->save();
    DB::table('bantuan_staff')->updateOrInsert(['user_id'=>$this->verifier->id],['phone'=>Crypt::encryptString('081234567890')]);
    DB::table('bantuan_events')->where('application_id',$id)->update(['action'=>'assign_survey','created_at'=>now()->subDays(6)]);
    $url='/api/v1/bantuan/applications/'.$id.'/remind-survey';
    $this->postJson($url)->assertOk()->assertJsonPath('data.url',fn($url)=>str_starts_with($url,'https://wa.me/6281234567890?text='));
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->where('user_id',$this->verifier->id)->count())->toBe(1);
    $this->postJson($url)->assertOk();
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->where('user_id',$this->verifier->id)->count())->toBe(1);
    $this->getJson('/api/v1/bantuan/applications?surveyOverdue=1')->assertJsonCount(1,'data');
    $this->actingAs($this->verifier,'sanctum')->postJson($url)->assertForbidden();
    Application::findOrFail($id)->forceFill(['status'=>'survey_cc_review'])->save();
    $this->actingAs($this->cc,'sanctum')->postJson($url)->assertConflict();
});

it('counts personal achievements once per application and respects report filters',function(){
 $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
 Application::findOrFail($id)->forceFill(['status'=>'completed','verifier_id'=>$this->verifier->id,'distributor_id'=>$this->verifier->id,'amount'=>2000000,'handover'=>['amount'=>1900000]])->save();
 DB::table('bantuan_events')->where('application_id',$id)->update(['action'=>'survey_submit','actor_id'=>$this->verifier->id]);
 $this->actingAs($this->verifier,'sanctum')->getJson('/api/v1/bantuan/dashboard')->assertOk()->assertJsonPath('data.personal.surveyed',1)->assertJsonPath('data.personal.distributed',1)->assertJsonPath('data.personal.distributedAmount',1900000);
 $this->getJson('/api/v1/bantuan/dashboard?program=TidakAda')->assertOk()->assertJsonPath('data.personal.surveyed',0);
});


it('serves authenticated cascading region choices and fails gracefully without requiring them',function(){
    \Illuminate\Support\Facades\Cache::flush();
    \Illuminate\Support\Facades\Http::fake(['*provinces.json'=>\Illuminate\Support\Facades\Http::response([['id'=>'32','name'=>'JAWA BARAT']]),'*regencies/32.json'=>\Illuminate\Support\Facades\Http::response([],503)]);
    $this->actingAs($this->cc,'sanctum')->getJson('/api/v1/bantuan/regions/province')->assertOk()->assertJsonPath('data.0.name','Jawa Barat');
    $this->getJson('/api/v1/bantuan/regions/city')->assertUnprocessable();
    $this->getJson('/api/v1/bantuan/regions/city?parent=32')->assertStatus(503);
    $this->getJson('/api/v1/bantuan/regions/city?parent=../secret')->assertUnprocessable();
});

it('stores optional education evidence privately for the assigned distributor',function(){
    $input=bantuanInput();$input['program']='Pendidikan';
    $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',$input)->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status'=>'disbursed','distribution_type'=>'verifier','distributor_id'=>$this->verifier->id])->save();
    $png=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
    $url='/api/v1/bantuan/applications/'.$id.'/documents';
    $data=['kind'=>'education_other','file'=>UploadedFile::fake()->createWithContent('bukti.png',$png),'caption'=>'Bukti pembelian perlengkapan'];
    $this->post($url,$data,['Accept'=>'application/json'])->assertForbidden();
    $doc=$this->actingAs($this->verifier,'sanctum')->post($url,$data,['Accept'=>'application/json'])->assertCreated()->json('data.id');
    $this->get('/api/v1/bantuan/documents/'.$doc)->assertOk()->assertContent($png);
});

it('limits treasury delivery tasks to direct handovers and their own verifier assignments', function () {
    $user = bantuanUser('treasurer');
    bantuanRoles($user, ['treasurer', 'verifier']);
    foreach (['other', 'own', 'direct'] as $kind) {
        $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
        Application::findOrFail($id)->forceFill(['status'=>'disbursed','amount'=>500000,'distribution_type'=>$kind==='direct'?'direct':'verifier','distributor_id'=>$kind==='own'?$user->id:$this->verifier->id])->save();
    }
    $this->actingAs($user, 'sanctum');
    $this->getJson('/api/v1/bantuan/applications?task=distribution')->assertOk()->assertJsonPath('total', 2);
    $this->getJson('/api/v1/bantuan/dashboard')->assertOk()->assertJsonPath('data.taskCounts.distribution.disbursed', 2);
    bantuanRoles($user, ['treasurer']);
    $this->getJson('/api/v1/bantuan/applications?task=distribution')->assertOk()->assertJsonPath('total', 1);
});
it('copies only routine santunan into the next month once with fresh reports and statuses', function () {
    $this->verifier = bantuanUser('volunteer');
    $payload = ['frequency' => 'routine', 'category' => 'widow', 'period' => '2026-12',
        'recipientName' => 'Penerima rutin', 'volunteerId' => $this->verifier->id, 'amount' => 300000];
    $id = $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan', $payload)->assertCreated()->json('data.id');
    $this->postJson('/api/v1/bantuan/santunan', [...$payload, 'frequency' => 'non_routine', 'category' => 'orphan'])->assertCreated();
    \App\Modules\Bantuan\Models\Santunan::findOrFail($id)->forceFill([
        'transfer_status' => 'transferred', 'distribution_status' => 'completed',
        'report' => ['description' => 'Laporan lama'], 'completed_at' => '2026-12-05', 'version' => 3,
    ])->save();
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/santunan/periods', ['sourcePeriod' => '2026-12'])->assertForbidden();
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan/periods', ['sourcePeriod' => '2026-12'])
        ->assertCreated()->assertJsonPath('data.period', '2027-01')->assertJsonPath('data.createdCount', 1);
    $this->getJson('/api/v1/bantuan/santunan?period=2027-01')->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.recipientName', 'Penerima rutin')->assertJsonPath('data.0.amount', 300000)
        ->assertJsonPath('data.0.volunteerId', $this->verifier->id)->assertJsonPath('data.0.transferStatus', 'pending')
        ->assertJsonPath('data.0.distributionStatus', 'process')->assertJsonPath('data.0.report', null)
        ->assertJsonPath('data.0.completedAt', null)->assertJsonPath('data.0.transferredAt', null)->assertJsonCount(0, 'data.0.documents');
    $this->postJson('/api/v1/bantuan/santunan/periods', ['sourcePeriod' => '2026-12'])->assertConflict();
    $this->postJson('/api/v1/bantuan/santunan/periods', ['sourcePeriod' => '2025-01'])->assertUnprocessable();
    expect(\App\Modules\Bantuan\Models\Santunan::findOrFail($id)->report['description'])->toBe('Laporan lama');
});


it('copies fifty routine recipients and rejects inactive distributors without partial results', function () {
    $this->verifier = bantuanUser('volunteer');
    for ($i = 1; $i <= 50; $i++) {
        \App\Modules\Bantuan\Models\Santunan::forceCreate([
            'id' => (string) Str::uuid(), 'number' => 'TEST-ROUTINE-'.$i,
            'frequency' => 'routine', 'category' => 'widow', 'period' => '2026-10-01',
            'recipient' => ['name' => 'Penerima '.$i], 'volunteer_id' => $this->verifier->id,
            'amount' => 300000, 'transfer_status' => 'pending', 'distribution_status' => 'process', 'version' => 1,
        ]);
    }
    $this->verifier->forceFill(['is_active' => false])->save();
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan/periods', ['sourcePeriod' => '2026-10'])->assertUnprocessable();
    expect(\App\Modules\Bantuan\Models\Santunan::count())->toBe(50);
    $this->verifier->forceFill(['is_active' => true])->save();
    $this->postJson('/api/v1/bantuan/santunan/periods', ['sourcePeriod' => '2026-10'])->assertCreated()->assertJsonPath('data.createdCount', 50);
    expect(\App\Modules\Bantuan\Models\Santunan::whereDate('period', '2026-11-01')->count())->toBe(50);
});


it('accepts routine card programs and restricts non-routine santunan to orphans', function (string $category) {
    $distributor = bantuanUser('volunteer');
    $input = ['frequency' => 'routine', 'category' => $category, 'period' => '2026-11',
        'recipientName' => 'Penerima Program', 'volunteerId' => $distributor->id, 'amount' => 500000];
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/santunan', $input)
        ->assertCreated()->assertJsonPath('data.category', $category);
    $result = $this->postJson('/api/v1/bantuan/santunan', [...$input, 'frequency' => 'non_routine']);
    if ($category === 'orphan') $result->assertCreated();
    else $result->assertUnprocessable();
})->with(['widow', 'orphan', 'foster_child', 'tahfidz']);


it('prepares immediate survey assignment details only for call center with an active assignment',function(){
    $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($id)->forceFill(['status'=>'survey_assigned','verifier_id'=>$this->verifier->id,'survey_location'=>['address'=>'Jalan Melati Nomor 10, Bogor']])->save();
    DB::table('bantuan_staff')->updateOrInsert(['user_id'=>$this->verifier->id],['phone'=>Crypt::encryptString('081234567890')]);
    $url='/api/v1/bantuan/applications/'.$id.'/remind-survey';
    $this->postJson($url)->assertConflict();
    $response = $this->postJson($url,['purpose'=>'assignment'])->assertOk();
    $message = $response->json('data.message');
    $row = Application::findOrFail($id);
    expect($message)->toContain('Jalan Melati Nomor 10, Bogor', 'Bapak/Ibu mendapat penugasan survei bantuan',
        $this->verifier->name, $row->number, $row->name, $row->program, 'Mohon konfirmasi kesiapan kunjungan');
    expect($message)->toContain('No. HP calon penerima: '.$row->applicant['phone']);
    expect($response->json('data.url'))->toBe('https://wa.me/6281234567890?text='.rawurlencode($message));
    $this->actingAs($this->verifier,'sanctum')->postJson($url,['purpose'=>'assignment'])->assertForbidden();
    Application::findOrFail($id)->forceFill(['status'=>'completed'])->save();
    $this->actingAs($this->cc,'sanctum')->postJson($url,['purpose'=>'assignment'])->assertConflict();
});

it('lets module admins permanently delete every stage with explicit confirmation and version protection', function (string $status) {
    Storage::fake('local');
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $row = Application::findOrFail($id);
    $row->forceFill(['status' => $status])->save();
    $doc = bantuanDoc($id, 'ktp');
    $path = 'bantuan/'.$id.'/test.enc';
    DB::table('bantuan_documents')->where('id', $doc)->update(['path' => $path]);
    Storage::disk('local')->put($path, 'test');
    $url = '/api/v1/bantuan/applications/'.$id;
    if ($status !== 'draft') $this->deleteJson($url, ['version' => 1, 'confirmation' => $row->number])->assertConflict();
    $this->actingAs(bantuanUser('admin'), 'sanctum');
    $this->deleteJson($url, ['version' => 99, 'confirmation' => $row->number])->assertConflict();
    if ($status !== 'draft') $this->deleteJson($url, ['version' => 1, 'confirmation' => 'wrong'])->assertUnprocessable();
    $this->deleteJson($url, ['version' => 1, 'confirmation' => $row->number])->assertOk();
    $this->assertDatabaseMissing('bantuan_applications', ['id' => $id]);
    $this->assertDatabaseMissing('bantuan_documents', ['application_id' => $id]);
    $this->assertDatabaseMissing('bantuan_events', ['application_id' => $id]);
    $this->assertDatabaseMissing('bantuan_notifications', ['application_id' => $id]);
    Storage::disk('local')->assertMissing($path);
})->with(['draft', 'survey_assigned', 'fund_submitted', 'disbursed', 'completed', 'cancelled']);

it('removes funding snapshots and recalculates shared groups without deleting other applications', function () {
    $ids = [];
    for ($i=0; $i<2; $i++) $ids[] = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $group = (string) Str::uuid();
    DB::table('bantuan_funding_requests')->insert(['id'=>$group,'number'=>'TEST-DELETE','title'=>'Uji','total_amount'=>300,'created_by'=>$this->cc->id,'created_at'=>now(),'updated_at'=>now()]);
    foreach ($ids as $i=>$id) {
        $row = Application::findOrFail($id);
        $row->forceFill(['status'=>'completed'])->save();
        DB::table('bantuan_funding_request_items')->insert(['id'=>(string) Str::uuid(),'funding_request_id'=>$group,'application_id'=>$id,'number'=>$row->number,'name'=>'Uji','program'=>'Uji','region'=>'Bogor','amount'=>($i+1)*100,'submitted_version'=>1]);
    }
    $this->actingAs(bantuanUser('admin'), 'sanctum');
    foreach ($ids as $i=>$id) {
        $row = Application::findOrFail($id);
        $this->deleteJson('/api/v1/bantuan/applications/'.$id,['version'=>1,'confirmation'=>$row->number])->assertOk();
        if ($i===0) {
            $this->assertDatabaseHas('bantuan_applications',['id'=>$ids[1]]);
            $this->assertDatabaseHas('bantuan_funding_requests',['id'=>$group,'total_amount'=>200,'version'=>2]);
        }
    }
    $this->assertDatabaseMissing('bantuan_funding_requests',['id'=>$group]);
    expect(DB::table('bantuan_funding_request_items')->where('funding_request_id',$group)->count())->toBe(0);
});


it('shows the rejection decision on application lists without exposing unrelated event notes', function () {
    $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
    $row=Application::findOrFail($id);
    $row->forceFill(['status'=>'rejected_t1'])->save();
    DB::table('bantuan_events')->insert(['id'=>(string) Str::uuid(),'application_id'=>$id,'actor_id'=>$this->approver->id,'actor_role'=>'approver','action'=>'review1_reject','from_status'=>'review1','to_status'=>'rejected_t1','details'=>Crypt::encryptString(json_encode(['reason'=>'Kebutuhan sudah ditangani program lain.'])),'created_at'=>now()]);
    DB::table('bantuan_events')->insert(['id'=>(string) Str::uuid(),'application_id'=>$id,'actor_id'=>$this->cc->id,'actor_role'=>'call_center','action'=>'note','from_status'=>'rejected_t1','to_status'=>'rejected_t1','details'=>Crypt::encryptString(json_encode(['reason'=>'Catatan lain bukan alasan penolakan.'])),'created_at'=>now()->addSecond()]);
    $data=$this->getJson('/api/v1/bantuan/applications')->assertOk()->json('data');
    expect(collect($data)->firstWhere('id',$id)['rejectionReason'])->toBe('Kebutuhan sudah ditangani program lain.');
    $row->forceFill(['status'=>'review1'])->save();
    $data=$this->getJson('/api/v1/bantuan/applications')->assertOk()->json('data');
    expect(collect($data)->firstWhere('id',$id)['rejectionReason'])->toBeNull();
});

it('groups bulk reminders by responsible recipient and rolls back stale batches', function () {
    $items=[];
    foreach (['review1','review1','survey_assigned'] as $status) {
        $id=$this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
        Application::findOrFail($id)->forceFill(['status'=>$status,'verifier_id'=>$this->verifier->id])->save();
        $items[]=['id'=>$id,'status'=>$status];
    }
    $url='/api/v1/bantuan/application-reminders';
    $this->actingAs($this->approver,'sanctum')->postJson($url,['applications'=>$items])->assertForbidden();
    $stale=$items;
    $stale[2]['status']='fund_ready';
    $this->actingAs($this->cc,'sanctum')->postJson($url,['applications'=>$stale])->assertConflict();
    expect(DB::table('bantuan_notifications')->count())->toBe(0);
    $data=$this->postJson($url,['applications'=>$items])->assertOk()->assertJsonCount(2,'data.recipients')->json('data');
    $groups=collect($data['recipients'])->keyBy('id');
    expect($groups[$this->approver->id]['count'])->toBe(2);
    expect($groups[$this->verifier->id]['count'])->toBe(1);
    foreach (array_slice($items,0,2) as $item) expect($groups[$this->approver->id]['message'])->toContain(Application::findOrFail($item['id'])->number);
    expect($groups[$this->approver->id]['message'])->not->toContain(Application::findOrFail($items[2]['id'])->number);
    $this->postJson($url,['applications'=>$items])->assertOk();
    expect(DB::table('bantuan_notifications')->count())->toBe(3);
    expect(DB::table('bantuan_whatsapp_outbox')->count())->toBe(0);
    $this->postJson($url,['applications'=>[$items[0],$items[0]]])->assertUnprocessable();
});

it('sends card reminders only to the responsible active task recipients', function (string $status, string $recipient) {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    \App\Modules\Bantuan\Models\Application::findOrFail($id)->forceFill(['status'=>$status, 'verifier_id'=>$this->verifier->id, 'distribution_type'=>'verifier', 'distributor_id'=>$this->verifier->id])->save();
    $url='/api/v1/bantuan/applications/'.$id.'/reminders';
    $this->postJson($url,['status'=>$status])->assertOk()->assertJsonCount(1,'data.recipients')->assertJsonPath('data.recipients.0.id',$this->{$recipient}->id)->assertJsonPath('data.recipients.0.url',null);
    $this->postJson($url,['status'=>$status])->assertOk();
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->count())->toBe(1);
    expect(DB::table('bantuan_whatsapp_outbox')->where('application_id',$id)->count())->toBe(0);
    expect(\App\Modules\Bantuan\Models\Application::findOrFail($id)->status)->toBe($status);
})->with([['review1','approver'],['survey_assigned','verifier'],['fund_ready','fund'],['fund_submitted','fund'],['fund_approved','treasurer'],['disbursed','verifier']]);

it('rejects unauthorized stale and closed card reminders', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $row=\App\Modules\Bantuan\Models\Application::findOrFail($id);
    $row->forceFill(['status'=>'review1'])->save();
    $url='/api/v1/bantuan/applications/'.$id.'/reminders';
    $this->actingAs($this->approver,'sanctum')->postJson($url,['status'=>'review1'])->assertForbidden();
    $this->actingAs($this->cc,'sanctum')->postJson($url,['status'=>'fund_ready'])->assertConflict();
    $row->forceFill(['status'=>'completed'])->save();
    $this->postJson($url,['status'=>'completed'])->assertConflict();
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->count())->toBe(0);
});


it('lists involved reminder recipients without sending and accepts only explicitly related members', function () {
    $id = $this->actingAs($this->cc,'sanctum')->postJson('/api/v1/bantuan/applications',bantuanInput())->assertCreated()->json('data.id');
    \App\Modules\Bantuan\Models\Application::findOrFail($id)->forceFill(['status'=>'fund_ready','verifier_id'=>$this->verifier->id])->save();
    bantuanRoles($this->verifier,['verifier']);
    DB::table('bantuan_staff')->where('user_id',$this->verifier->id)->update(['phone'=>\Illuminate\Support\Facades\Crypt::encryptString('081234567890')]);
    $base='/api/v1/bantuan/applications/'.$id;
    $this->getJson($base.'/reminder-recipients?status=fund_ready')->assertOk()->assertJsonCount(2,'data.recipients');
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->count())->toBe(0);
    $this->postJson($base.'/reminders',['status'=>'fund_ready','recipientIds'=>[$this->treasurer->id]])->assertUnprocessable();
    $this->postJson($base.'/reminders',['status'=>'fund_ready','recipientIds'=>[$this->verifier->id],'note'=>'Mohon koordinasi kesiapan penyaluran.'])->assertOk()->assertJsonCount(1,'data.recipients')->assertJsonPath('data.recipients.0.id',$this->verifier->id);
    expect(DB::table('bantuan_notifications')->where('application_id',$id)->pluck('user_id')->all())->toBe([$this->verifier->id]);
});
