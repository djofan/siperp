<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $admin = new User;
    $admin->forceFill(['name' => 'Admin', 'email' => 'admin@cohort.test', 'password_hash' => bcrypt('test-password'), 'is_superadmin' => true, 'is_active' => true])->save();
    Sanctum::actingAs($admin);
    (new Module)->forceFill(['slug' => 'academy', 'name' => 'Academy', 'isActive' => true])->save();
});

function cohortParticipant(array $extra = []): array
{
    return $extra + ['name' => 'Peserta Baru', 'address' => 'Jakarta', 'phone' => '081234567899', 'password' => 'test-password', 'gender' => 'IKHWAN'];
}

function newAcademyCohort(string $title = 'Angkatan 1', int $quota = 200): AcademyCohort
{
    $cohort = new AcademyCohort;
    $cohort->title = $title;
    $cohort->quota = $quota;
    $cohort->registrationOpen = false;
    $cohort->save();

    return $cohort;
}

it('creates cohorts without requiring or copying a program', function () {
    $this->postJson('/api/v1/academy/admin/cohorts', ['title' => 'Angkatan Mandiri', 'quota' => 30])->assertSuccessful();
    expect(ZakatAcademyCourse::count())->toBe(0);
    $this->getJson('/api/v1/academy/admin/cohorts')->assertJsonPath('data.0.title', 'Angkatan Mandiri')->assertJsonPath('data.0.participants_count', 0);
    $this->postJson('/api/v1/academy/admin/cohorts', ['title' => 'Angkatan Mandiri', 'quota' => 30])->assertUnprocessable();
});

it('assigns participants to cohorts independently of program enrollment and filters the directory', function () {
    $cohort = newAcademyCohort();
    $other = newAcademyCohort('Angkatan 2');
    $this->postJson('/api/v1/academy/participants', cohortParticipant(['cohortId' => $cohort->id]))->assertCreated();
    $profile = ZakatAcademyProfile::firstOrFail();
    expect($profile->cohortId)->toBe($cohort->id)->and($profile->enrollments()->count())->toBe(0);
    $this->getJson('/api/v1/academy/admin/intake?cohort='.$cohort->id)->assertJsonPath('data.total', 1)->assertJsonPath('data.people.0.cohort.title', 'Angkatan 1');
    $this->getJson('/api/v1/academy/admin/intake?cohort='.$other->id)->assertJsonPath('data.total', 0);
    $this->putJson('/api/v1/academy/participants/'.$profile->id, cohortParticipant(['cohortId' => $other->id]))->assertConflict();
    expect($profile->fresh()->cohortId)->toBe($cohort->id);
});

it('requires a valid cohort and ignores the former quota when registering participants', function () {
    $cohort = newAcademyCohort(quota: 1);
    $this->postJson('/api/v1/academy/participants', cohortParticipant())->assertUnprocessable();
    $this->postJson('/api/v1/academy/participants', cohortParticipant(['cohortId' => 'missing']))->assertUnprocessable();
    $this->postJson('/api/v1/academy/participants', cohortParticipant(['cohortId' => $cohort->id]))->assertCreated();
    $this->postJson('/api/v1/academy/participants', cohortParticipant(['cohortId' => $cohort->id, 'phone' => '081234567898']))->assertCreated();
    expect(ZakatAcademyProfile::count())->toBe(2)->and(User::count())->toBe(3);
});

it('opens only one public cohort and registers new accounts in that cohort without a program', function () {
    $first = newAcademyCohort();
    $second = newAcademyCohort('Angkatan 2');
    $this->putJson('/api/v1/academy/admin/cohorts/'.$first->id.'/registration', ['open' => true])->assertSuccessful();
    $this->putJson('/api/v1/academy/admin/cohorts/'.$second->id.'/registration', ['open' => true])->assertSuccessful();
    expect($first->fresh()->registrationOpen)->toBeFalse();
    $this->getJson('/api/v1/academy/intake')->assertJsonPath('data.cohort.id', $second->id)->assertJsonPath('data.filled', 0);
    $this->postJson('/api/v1/academy/register', cohortParticipant(['email' => 'student@cohort.test', 'confirmPassword' => 'test-password', 'cohortId' => $first->id]))->assertCreated();
    expect(ZakatAcademyProfile::firstOrFail()->cohortId)->toBe($second->id)->and(ZakatAcademyCourse::count())->toBe(0);
    $this->putJson('/api/v1/academy/admin/cohorts/'.$second->id.'/registration', ['open' => false])->assertSuccessful();
    $this->postJson('/api/v1/academy/register', cohortParticipant(['email' => 'another@cohort.test', 'confirmPassword' => 'test-password']))->assertConflict();
});

it('forbids ordinary participants from creating cohorts', function () {
    $user = new User;
    $user->forceFill(['name' => 'Peserta', 'email' => 'participant@cohort.test', 'password_hash' => bcrypt('test-password'), 'is_active' => true])->save();
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/academy/admin/cohorts', ['title' => 'Forbidden', 'quota' => 20])->assertForbidden();
});

it('rejects a course from another cohort without creating a participant account', function () {
    $chosen = newAcademyCohort('Angkatan Pilihan');
    $other = newAcademyCohort('Angkatan Lain');
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($other->id));

    $this->postJson('/api/v1/academy/participants', cohortParticipant([
        'cohortId' => $chosen->id,
        'courseId' => $chapter->courseId,
    ]))->assertUnprocessable();

    expect(ZakatAcademyProfile::count())->toBe(0)->and(User::count())->toBe(1);
});
