<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\AcademyCohortMembership;
use App\Modules\Academy\Models\ZakatAcademyLesson;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Models\ZakatAcademyQuiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = new User;
    $this->admin->forceFill(['name' => 'Admin', 'email' => 'admin@scope.test', 'password_hash' => bcrypt('test-password'), 'is_superadmin' => true, 'is_active' => true])->save();
    Sanctum::actingAs($this->admin);
    (new Module)->forceFill(['slug' => 'academy', 'name' => 'Academy', 'isActive' => true])->save();
    $this->first = new AcademyCohort;
    $this->first->title = 'Angkatan 1';
    $this->first->save();
    $this->second = new AcademyCohort;
    $this->second->title = 'Angkatan 2';
    $this->second->registrationOpen = true;
    $this->second->save();
});

function scopedStudent(AcademyCohort $cohort, string $email): ZakatAcademyProfile
{
    $user = new User;
    $user->forceFill(['name' => 'Peserta', 'email' => $email, 'password_hash' => bcrypt('test-password'), 'is_active' => true])->save();
    $profile = new ZakatAcademyProfile;
    $profile->userId = $user->id;
    $profile->nis = 'PAZ'.Str::random(8);
    $profile->save();
    app(CohortLearning::class)->join($profile, $cohort);
    return $profile;
}

it('requires a cohort before creating materials or quizzes', function () {
    $this->postJson('/api/v1/academy/admin/materials', ['title' => 'Audio', 'order' => 1])->assertUnprocessable();
    $this->postJson('/api/v1/academy/admin/material-quizzes', ['title' => 'Kuis'])->assertUnprocessable();
});

it('duplicates audio into an independent draft with protected shared storage and no progress', function () {
    Storage::fake('local');
    $sourceId = $this->postJson('/api/v1/academy/admin/materials', ['title' => 'Audio asal', 'order' => 3, 'shortDescription' => 'Deskripsi', 'cohortId' => $this->first->id])->assertSuccessful()->json('data.id');
    $this->post('/api/v1/academy/upload', ['lessonId' => $sourceId, 'audioOnly' => '1', 'file' => UploadedFile::fake()->createWithContent('asal.mp3', 'ID3'.str_repeat('a', 64))], ['Accept' => 'application/json'])->assertSuccessful();
    $this->putJson('/api/v1/academy/admin/materials/'.$sourceId, ['isPublished' => true])->assertSuccessful();
    $copyId = $this->postJson('/api/v1/academy/admin/materials/'.$sourceId.'/duplicate', ['cohortId' => $this->second->id])->assertSuccessful()->json('data.id');
    $source = ZakatAcademyLesson::findOrFail($sourceId);
    $copy = ZakatAcademyLesson::findOrFail($copyId);
    expect($copy->id)->not->toBe($source->id)->and($copy->isPublished)->toBeFalse()->and($copy->title)->toBe($source->title)
        ->and($copy->order)->toBe(3)->and($copy->shortDescription)->toBe('Deskripsi')
        ->and($copy->videoUrl)->not->toBe($source->videoUrl)->and($copy->lessonProgress()->count())->toBe(0);
    expect(count(Storage::disk('local')->allFiles('academy')))->toBe(1);
    $this->putJson('/api/v1/academy/admin/materials/'.$copyId, ['title' => 'Audio salinan', 'isPublished' => true])->assertSuccessful();
    expect($source->fresh()->title)->toBe('Audio asal');
    $student = scopedStudent($this->second, 'second@scope.test');
    Sanctum::actingAs($student->user);
    $this->getJson('/api/v1/academy/materials')->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.id', $copyId);
    $this->getJson('/api/v1/academy/materials/'.$sourceId)->assertNotFound();
    $this->postJson('/api/v1/academy/materials/'.$sourceId.'/start')->assertNotFound();
    $this->get(str_replace('/api/academy/', '/api/v1/academy/', $copy->videoUrl))->assertSuccessful();
    $this->get(str_replace('/api/academy/', '/api/v1/academy/', $source->videoUrl))->assertNotFound();
    $this->putJson('/api/v1/academy/lessons/'.$copyId.'/progress', ['completed' => true])->assertSuccessful();
    expect($source->lessonProgress()->count())->toBe(0);
});

it('permits the same account to join a later cohort only after all exams including final are completed', function () {
    $material = $this->postJson('/api/v1/academy/admin/materials', ['title' => 'Audio 1', 'order' => 1, 'contentSummary' => 'Materi', 'isPublished' => true, 'cohortId' => $this->first->id])->json('data.id');
    $firstLesson = ZakatAcademyLesson::findOrFail($material);
    $oldQuiz = new ZakatAcademyQuiz;
    $oldQuiz->forceFill(['chapterId' => $firstLesson->chapterId, 'title' => 'Ujian akhir', 'kind' => 'FINAL', 'isPublished' => true, 'isActive' => true])->save();
    $student = scopedStudent($this->first, 'repeat@scope.test');
    $nip = $student->nis;
    Sanctum::actingAs($student->user);
    $this->postJson('/api/v1/academy/cohorts/'.$this->second->id.'/join')->assertConflict();
    $attempt = new ZakatAcademyQuizAttempt;
    $attempt->forceFill(['profileId' => $student->id, 'quizId' => $oldQuiz->id, 'attemptNumber' => 1, 'score' => 25, 'passed' => false, 'isCompleted' => true, 'submittedAt' => now(), 'answers' => []])->save();
    $this->postJson('/api/v1/academy/cohorts/'.$this->second->id.'/join')->assertSuccessful();
    $this->postJson('/api/v1/academy/cohorts/'.$this->second->id.'/join')->assertConflict();
    expect($student->fresh()->nis)->toBe($nip)->and(AcademyCohortMembership::where('profile_id', $student->id)->count())->toBe(2)
        ->and(ZakatAcademyQuizAttempt::where('profile_id', $student->id)->count())->toBe(1);
    Sanctum::actingAs($this->admin);
    $newQuizId = $this->postJson('/api/v1/academy/admin/material-quizzes', ['title' => 'Ujian baru', 'kind' => 'FINAL', 'passingScore' => 70, 'timeLimitMinutes' => 10, 'releaseDay' => 1, 'cohortId' => $this->second->id])->assertSuccessful()->json('data.id');
    expect(ZakatAcademyQuizAttempt::where('profile_id', $student->id)->where('quiz_id', $newQuizId)->count())->toBe(0);
    $this->getJson('/api/v1/academy/admin/cohorts')->assertSuccessful();
    expect($this->first->participants()->count())->toBe(1)->and($this->second->participants()->count())->toBe(1);
});

it('registers participant 201 without enforcing the old 200-person limit', function () {
    $users = $profiles = $memberships = [];
    for ($i = 0; $i < 200; $i++) {
        $userId = (string) Str::uuid();
        $profileId = (string) Str::uuid();
        $users[] = ['id' => $userId, 'name' => 'Old '.$i, 'email' => 'old'.$i.'@scope.test', 'password_hash' => 'unused'];
        $profiles[] = ['id' => $profileId, 'user_id' => $userId, 'cohort_id' => $this->second->id];
        $memberships[] = ['id' => (string) Str::uuid(), 'cohort_id' => $this->second->id, 'profile_id' => $profileId, 'joined_at' => now()];
    }
    DB::table('users')->insert($users);
    DB::table('zakat_academy_profiles')->insert($profiles);
    DB::table('academy_cohort_memberships')->insert($memberships);
    $this->postJson('/api/v1/academy/participants', ['name' => 'Peserta 201', 'address' => 'Jakarta', 'phone' => '081234567811', 'password' => 'test-password', 'gender' => 'IKHWAN', 'cohortId' => $this->second->id])->assertCreated();
    expect($this->second->participants()->count())->toBe(201);
    $this->getJson('/api/v1/academy/intake')->assertJsonPath('data.full', false)->assertJsonPath('data.filled', 201);
});
