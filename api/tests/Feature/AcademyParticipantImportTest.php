<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\ModuleAccess;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = (new User)->forceFill(['name' => 'Admin impor', 'email' => 'admin@import.test', 'password_hash' => bcrypt('test-password'), 'is_superadmin' => true, 'is_active' => true]);
    $this->admin->save();
    $this->module = new Module;
    $this->module->forceFill(['slug' => 'academy', 'name' => 'Academy', 'isActive' => true])->save();
    $this->cohort = new AcademyCohort;
    $this->cohort->forceFill(['title' => 'Angkatan Impor', 'quota' => 1, 'registrationOpen' => false])->save();
    $this->payload = ['cohortId' => $this->cohort->id, 'gender' => 'IKHWAN', 'rows' => [
        ['rowNumber' => 2, 'name' => 'Peserta Satu', 'phone' => '081234567890', 'address' => 'Jakarta'],
        ['rowNumber' => 3, 'name' => 'Peserta Dua', 'phone' => '81234567891', 'address' => 'Bogor'],
    ]];
});

it('imports accounts and cohort learning access with hashed temporary passwords', function () {
    Sanctum::actingAs($this->admin);
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->cohort->id));
    $response = $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)
        ->assertOk()->assertJsonPath('data.createdCount', 2)->assertJsonPath('data.skippedCount', 0)
        ->assertHeader('Cache-Control', 'no-store, private');
    $accounts = $response->json('data.credentials');
    expect(ZakatAcademyProfile::count())->toBe(2)->and(User::count())->toBe(3);
    foreach ($accounts as $index => $account) {
        $user = User::where('code', $account['code'])->firstOrFail();
        $profile = ZakatAcademyProfile::where('user_id', $user->id)->firstOrFail();
        expect($account['code'])->toBe('PAZ00'.($index + 1))
            ->and($account['password'])->toBe('1234567890')
            ->and(Hash::check('1234567890', $user->password_hash))->toBeTrue()
            ->and($profile->mustChangePassword)->toBeTrue()
            ->and($profile->phone)->toBe('628123456789'.$index)
            ->and($profile->address)->toBe($this->payload['rows'][$index]['address'])
            ->and($profile->gender)->toBe('IKHWAN')
            ->and(app(CohortLearning::class)->owns($profile->id, $this->cohort->id))->toBeTrue()
            ->and($profile->enrollments()->where('course_id', $chapter->courseId)->exists())->toBeTrue();
        $this->assertDatabaseHas('user_login_codes', ['code' => $account['code'], 'user_id' => $user->id]);
        $this->assertDatabaseMissing('module_access', ['user_id' => $user->id]);
    }
    $this->getJson('/api/v1/academy/admin/intake')->assertJsonPath('data.total', 2);
});

it('skips exact reimports without changing passwords or creating memberships twice', function () {
    Sanctum::actingAs($this->admin);
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertOk();
    $hashes = User::pluck('password_hash', 'id')->all();
    $this->payload['rows'][0]['phone'] = '+62 812-3456-7890';
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)
        ->assertOk()->assertJsonPath('data.createdCount', 0)->assertJsonPath('data.skippedCount', 2)->assertJsonPath('data.credentials', []);
    expect(User::pluck('password_hash', 'id')->all())->toBe($hashes)
        ->and(ZakatAcademyProfile::count())->toBe(2)
        ->and(DB::table('academy_cohort_memberships')->count())->toBe(2);
});

it('rejects duplicate phone variants and missing or invalid fields before creating accounts', function (string $case) {
    Sanctum::actingAs($this->admin);
    if ($case === 'duplicate') $this->payload['rows'][1]['phone'] = '+62 81234567890';
    if ($case === 'phone') $this->payload['rows'][1]['phone'] = 'not-a-phone';
    if ($case === 'address') $this->payload['rows'][1]['address'] = '';
    if ($case === 'name') $this->payload['rows'][1]['name'] = 'A';
    if ($case === 'cohort') $this->payload['cohortId'] = 'missing';
    if ($case === 'gender') unset($this->payload['gender']);
    if ($case === 'empty') $this->payload['rows'] = [];
    if ($case === 'limit') $this->payload['rows'] = array_fill(0, 201, $this->payload['rows'][0]);
    if ($case === 'object') $this->payload['rows'] = ['bad-index' => $this->payload['rows'][0]];
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertUnprocessable();
    expect(User::count())->toBe(1)->and(ZakatAcademyProfile::count())->toBe(0);
})->with(['duplicate', 'phone', 'address', 'name', 'cohort', 'gender', 'empty', 'limit', 'object']);

it('rolls back earlier rows if a later row conflicts with an existing participant', function () {
    Sanctum::actingAs($this->admin);
    $first = $this->payload;
    $first['rows'] = [$this->payload['rows'][1]];
    $this->postJson('/api/v1/academy/admin/participant-imports', $first)->assertOk();
    $this->payload['rows'][1]['name'] = 'Different Person';
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertUnprocessable()->assertJsonValidationErrors('rows.1.phone', 'error.details');
    expect(User::count())->toBe(2)->and(ZakatAcademyProfile::count())->toBe(1)
        ->and(DB::table('participant_sequences')->where('module_slug', 'academy')->value('last_number'))->toBe(1);
});

it('recognizes formatted legacy phone numbers without creating duplicate accounts', function () {
    Sanctum::actingAs($this->admin);
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertOk();
    ZakatAcademyProfile::where('phone', '6281234567890')->update(['phone' => '+62 (812) 3456-7890']);
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)
        ->assertOk()->assertJsonPath('data.createdCount', 0)->assertJsonPath('data.skippedCount', 2);
    expect(User::count())->toBe(3)->and(ZakatAcademyProfile::count())->toBe(2);
});

it('does not move old participants into another cohort or restore inactive accounts', function (string $case) {
    Sanctum::actingAs($this->admin);
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertOk();
    if ($case === 'cohort') {
        $other = new AcademyCohort;
        $other->forceFill(['title' => 'Angkatan Berikutnya'])->save();
        $this->payload['cohortId'] = $other->id;
    } elseif ($case === 'inactive') User::where('is_superadmin', false)->update(['is_active' => false]);
    else $this->payload['gender'] = 'AKHWAT';
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertUnprocessable();
    expect(User::count())->toBe(3)->and(ZakatAcademyProfile::where('cohort_id', $this->cohort->id)->count())->toBe(2);
})->with(['cohort', 'inactive', 'gender']);

it('requires authentication and the Academy admin role', function () {
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertUnauthorized();
    $teacher = (new User)->forceFill(['name' => 'Teacher', 'is_active' => true, 'password_hash' => bcrypt('test-password')]);
    $teacher->save();
    $access = new ModuleAccess;
    $access->forceFill(['userId' => $teacher->id, 'moduleId' => $this->module->id, 'role' => 'teacher'])->save();
    Sanctum::actingAs($teacher);
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertForbidden();
    $access->role = 'admin';
    $access->save();
    $this->postJson('/api/v1/academy/admin/participant-imports', $this->payload)->assertOk()->assertJsonPath('data.createdCount', 2);
});
