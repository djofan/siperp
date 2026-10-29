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
        ->assertOk()->assertJsonPath('data.count', 2)->assertJsonCount(0, 'data.applications');
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
    foreach (['survey_recipient', 'survey_front', 'survey_inside', 'survey_inside', 'survey_environment'] as $kind) bantuanDoc($id, $kind);
    $this->postJson('/api/v1/bantuan/applications/'.$id.'/actions/survey_submit', ['version' => 1, 'survey' => $survey])->assertOk()->assertJsonPath('data.status', 'survey_submitted');
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

it('supports fund requester and verifier roles with explicit switching and immediate revocation', function () {
    $admin = bantuanUser('admin');
    $id = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/bantuan/staff', [
        'name' => 'Petugas dua peran', 'email' => 'multi@example.test', 'password' => 'password-aman-123',
        'roles' => ['fund_requester', 'verifier'], 'canBypass' => true,
    ])->assertCreated()->json('data.id');
    $target = User::findOrFail($id);
    expect(app(\App\Modules\Bantuan\Services\Access::class)->assigned($id, 'verifier'))->toBeTrue();
    $rowId = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::findOrFail($rowId)->forceFill(['status' => 'survey_assignment'])->save();
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/assign_survey', ['version' => 1, 'verifierId' => $id])->assertOk();
    $this->actingAs($target, 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'fund_requester')->assertJsonPath('data.roles', ['fund_requester', 'verifier']);
    $this->getJson('/api/v1/bantuan/applications/'.$rowId)->assertNotFound();
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'verifier'])->assertOk();
    $this->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'verifier');
    $this->getJson('/api/v1/bantuan/applications/'.$rowId)->assertOk();
    $this->postJson('/api/v1/bantuan/applications/'.$rowId.'/actions/fund_submit', ['version' => 2])->assertForbidden();
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'admin'])->assertForbidden();
    $this->actingAs($admin, 'sanctum')->putJson('/api/v1/bantuan/staff/'.$id, ['roles' => ['fund_requester'], 'active' => true, 'canBypass' => false])->assertOk();
    $this->actingAs($target, 'sanctum')->getJson('/api/v1/bantuan/viewer')->assertJsonPath('data.role', 'fund_requester');
    $this->putJson('/api/v1/bantuan/active-role', ['role' => 'verifier'])->assertForbidden();
    expect(app(\App\Modules\Bantuan\Services\Access::class)->assigned($id, 'verifier'))->toBeFalse();
});

it('keeps active roles isolated per login token and ignores obsolete grants after a Core change', function () {
    $user = bantuanUser('fund_requester');
    DB::table('bantuan_staff')->insert(['user_id' => $user->id, 'roles' => json_encode(['fund_requester', 'verifier']), 'can_bypass' => false]);
    $one = $user->createToken('one')->accessToken;
    $two = $user->createToken('two')->accessToken;
    DB::table('bantuan_active_roles')->insert(['session_key' => 'token:'.$one->id, 'user_id' => $user->id, 'role' => 'verifier']);
    $access = app(\App\Modules\Bantuan\Services\Access::class);
    foreach ([[$one, 'verifier'], [$two, 'fund_requester']] as [$token, $expected]) {
        $request = Illuminate\Http\Request::create('/');
        $request->setUserResolver(fn () => $user->fresh()->withAccessToken($token));
        $request->attributes->set('module_role', 'fund_requester');
        expect($access->role($request))->toBe($expected);
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

it('combines detailed application filters and exports exactly the filtered report', function () {
    $target = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $other = $this->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    Application::find($target)->forceFill(['status' => 'completed', 'amount' => 3500000, 'verifier_id' => $this->verifier->id,
        'distributor_id' => $this->verifier->id, 'distribution_type' => 'verifier', 'created_at' => '2026-10-02 08:00:00',
        'disbursed_at' => '2026-10-08 08:00:00', 'completed_at' => '2026-10-09 08:00:00', 'handover' => ['amount' => 3400000]])->save();
    Application::find($other)->forceFill(['status' => 'completed', 'amount' => 1000000, 'program' => 'Pendidikan', 'region' => 'Jakarta'])->save();
    $filters = ['program' => 'Kesehatan', 'status' => 'completed', 'source' => 'online', 'region' => 'Bandung',
        'dateField' => 'completed', 'from' => '2026-10-01', 'to' => '2026-10-31', 'verifierId' => $this->verifier->id,
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

it('filters audit records across the entire log and preserves management access', function () {
    $id = $this->actingAs($this->cc, 'sanctum')->postJson('/api/v1/bantuan/applications', bantuanInput())->assertCreated()->json('data.id');
    $number = Application::find($id)->number;
    $this->getJson('/api/v1/bantuan/audit')->assertForbidden();
    $admin = bantuanUser('admin');
    $this->actingAs($admin, 'sanctum')->getJson('/api/v1/bantuan/audit?'.http_build_query(['search' => $number, 'role' => 'call_center', 'action' => 'create', 'from' => now()->toDateString()]))
        ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.applicationNumber', $number)->assertJsonPath('data.0.actorName', $this->cc->name);
    $this->getJson('/api/v1/bantuan/audit?role=treasurer')->assertOk()->assertJsonPath('total', 0);
});
