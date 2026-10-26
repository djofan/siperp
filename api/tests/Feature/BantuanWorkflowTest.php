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
        'applicant' => ['name' => 'Pemohon Uji', 'nik' => '3271051234567890', 'birthPlace' => 'Bandung', 'birthDate' => '1980-01-01',
            'gender' => 'laki_laki', 'maritalStatus' => 'Menikah', 'street' => 'Alamat uji', 'rtRw' => '01/02', 'village' => 'Desa',
            'district' => 'Kecamatan', 'city' => 'Bandung', 'housing' => 'Menumpang', 'job' => 'Buruh', 'income' => 1000000,
            'incomePeriod' => 'bulan', 'dependentCount' => 2, 'phone' => '08123456789', 'prayer' => 'Ya', 'smoking' => 'Tidak',
            'previousAid' => false, 'publicationConsent' => false, 'hasSktm' => false, 'willingSktm' => true, 'informationSource' => 'Tetangga', 'problem' => 'Memerlukan biaya pengobatan'],
        'reporter' => ['name' => 'Pelapor Uji', 'date' => now()->toDateString(), 'maritalStatus' => 'Menikah', 'type' => 'Perorangan', 'phone' => '08123456700', 'address' => 'Alamat pelapor']];
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

it('keeps walk in screening and prevents assigning a verifier before approver approval', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', [...bantuanInput(), 'source' => 'walk_in'])->assertCreated()->json('data.id');
    bantuanDoc($id, 'ktp');
    bantuanDoc($id, 'face');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'screening');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_pass', ['version' => 2])->assertOk()->assertJsonPath('data.status', 'review1');
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/assign_survey', ['version' => 3, 'verifierId' => $this->verifier->id])->assertConflict();
    $this->actingAs($this->approver, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/review1_approve', ['version' => 3])->assertOk()->assertJsonPath('data.status', 'survey_assignment');
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
    $action($this->cc, 'assign_survey', ['verifierId' => $this->verifier->id]);
    $survey = ['date' => now()->toDateString(), 'hasSktm' => false, 'sktmExplanation' => 'Sedang mengurus', 'background' => 'Latar belakang',
        'currentCondition' => 'Kondisi uji', 'needs' => 'Biaya pengobatan', 'efforts' => 'Bekerja', 'homeObservation' => 'Rumah sederhana',
        'stayDuration' => 5, 'stayUnit' => 'tahun', 'socialRecord' => 'Baik', 'recommendation' => 'layak'];
    $this->actingAs($this->verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_submit', ['version' => $version, 'survey' => $survey])->assertUnprocessable();
    foreach (['survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) {
        bantuanDoc($id, $kind);
    }
    $action($this->verifier, 'survey_submit', ['survey' => $survey]);
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

it('keeps reasons mandatory and blocks reuse of an old transfer receipt', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->json('data.id');
    $row = Application::find($id);
    $row->forceFill(['status' => 'screening'])->save();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_reject', ['version' => 1])->assertUnprocessable();
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/screen_reject', ['version' => 1, 'reason' => 'Tidak memenuhi kriteria'])->assertOk();
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertJsonPath('data.events.1.reason', 'Tidak memenuhi kriteria');
    $row->refresh()->forceFill(['status' => 'fund_approved', 'amount' => 1000000])->save();
    $doc = bantuanDoc($id, 'transfer');
    DB::table('bantuan_documents')->where('id', $doc)->update(['used_at' => now()]);
    $this->actingAs($this->treasurer, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$id.'/actions/disburse',
        ['version' => 2, 'transferDate' => now()->toDateString(), 'transferAmount' => 1000000, 'account' => 'Rekening uji'])->assertUnprocessable();
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

it('records routine and non-routine santunan from transfer through volunteer report', function () {
    $volunteer = bantuanUser('volunteer');
    $otherVolunteer = bantuanUser('volunteer');
    $payload = ['frequency' => 'routine', 'category' => 'widow', 'period' => now()->format('Y-m'),
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
});
