<?php

use App\Modules\Academy\Models\AcademyCohort as Cohort;
use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function progressActor(string $name): User
{
    $user = new User;
    $user->forceFill(['name' => $name, 'password_hash' => bcrypt('synthetic-test-password'), 'is_active' => true])->save();

    return $user;
}

function progressAttempt(Profile $person, Quiz $quiz, ?float $score, bool $completed = true, int $number = 1): Attempt
{
    $attempt = new Attempt;
    $attempt->forceFill(['profileId' => $person->id, 'quizId' => $quiz->id, 'score' => $score, 'isCompleted' => $completed,
        'attemptNumber' => $number, 'startedAt' => now()->subMinutes(2), 'submittedAt' => $completed ? now()->subMinute() : null,
        'answers' => ['timeLimitMinutes' => 10, 'closesAt' => now()->addDay()->toISOString(), 'questions' => [['question' => 'SECRET_ANSWER_KEY']], 'responses' => ['PRIVATE_RESPONSE']]])->save();

    return $attempt;
}

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-18T10:00:00Z'));
    $this->module = (new Module)->forceFill(['slug' => 'academy', 'name' => 'Academy', 'isActive' => true]);
    $this->module->save();
    $this->admin = progressActor('Academy admin');
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $this->admin->id, 'module_id' => $this->module->id, 'role' => 'admin']);
    $this->cohort = (new Cohort)->forceFill(['title' => 'Angkatan QA']);
    $this->cohort->save();
    $this->course = (new Course)->forceFill(['title' => 'Materi QA', 'slug' => 'progress-qa', 'shortDescription' => 'QA', 'teacher' => 'Ustadz QA', 'cohortId' => $this->cohort->id, 'isPublished' => true, 'startsAt' => now()->subDay()]);
    $this->course->save();
    $this->chapter = (new Chapter)->forceFill(['courseId' => $this->course->id, 'title' => 'Materi', 'slug' => 'progress-chapter', 'isPublished' => true, 'order' => 1]);
    $this->chapter->save();
    $this->quizzes = [];
    foreach (['DAILY', 'WEEKLY', 'FINAL'] as $i => $kind) {
        $quiz = (new Quiz)->forceFill(['title' => 'Ujian QA '.$kind, 'chapterId' => $this->chapter->id, 'kind' => $kind, 'isPublished' => true, 'isActive' => true, 'quizDate' => now()->subHour(), 'closesAt' => now()->addDay(), 'releaseDay' => 1, 'timeLimitMinutes' => 10, 'passingScore' => 0, 'createdAt' => now()->subDay()->addSeconds($i)]);
        $quiz->save();
        $this->quizzes[] = $quiz;
    }
    $this->people = [];
    foreach (['PAZ003', 'PAZ004'] as $i => $nis) {
        $user = progressActor('Peserta QA '.$nis);
        $profile = (new Profile)->forceFill(['userId' => $user->id, 'nis' => $nis, 'gender' => $i ? 'AKHWAT' : 'IKHWAN', 'mustChangePassword' => false]);
        $profile->save();
        DB::transaction(fn () => app(CohortLearning::class)->join($profile, $this->cohort));
        $this->people[] = $profile;
    }
    foreach (['daily_weight' => 35, 'weekly_weight' => 30, 'final_weight' => 35] as $key => $value) {
        DB::table('zakat_academy_settings')->updateOrInsert(['key' => $key], ['id' => (string) Str::uuid(), 'value' => (string) $value]);
    }
    Sanctum::actingAs($this->admin);
});

afterEach(function () {
    $this->travelBack();
});

it('lets an ordinary Academy administrator see completed exams zero grades and current weighted totals', function () {
    foreach ([100, 20, 0] as $i => $score) {
        progressAttempt($this->people[0], $this->quizzes[$i], $score);
    }
    progressAttempt($this->people[0], $this->quizzes[0], 10, true, 2);
    // A legacy completion lacking a score must not hide a valid zero grade.
    progressAttempt($this->people[0], $this->quizzes[2], null, true, 2);
    $this->getJson('/api/v1/academy/admin/progress?cohort='.$this->cohort->id)->assertOk()->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.total', 2)->assertJsonPath('data.totalQuizzes', 3)->assertJsonPath('data.fullyCompletedParticipants', 1)
        ->assertJsonPath('data.items.0.nis', 'PAZ003')->assertJsonPath('data.items.0.completedQuizzes', 3)->assertJsonPath('data.items.0.allCompleted', true)
        ->assertJsonPath('data.items.0.score', 41)->assertJsonPath('data.items.0.averageScore', 40)->assertJsonPath('data.items.0.finalCompleted', true)
        ->assertJsonPath('data.items.1.completedQuizzes', 0)->assertDontSee('SECRET_ANSWER_KEY')->assertDontSee('PRIVATE_RESPONSE');
    $this->getJson('/api/v1/academy/admin/progress/'.$this->people[0]->id.'?cohort='.$this->cohort->id)->assertOk()
        ->assertJsonPath('data.summary.completedQuizzes', 3)->assertJsonPath('data.quizzes.2.score', 0)->assertJsonPath('data.quizzes.2.status', 'completed')
        ->assertJsonMissingPath('data.quizzes.0.answers')->assertDontSee('SECRET_ANSWER_KEY')->assertDontSee('PRIVATE_RESPONSE');
});

it('supports participant search group filters pagination and counts before pagination', function () {
    $this->getJson('/api/v1/academy/admin/progress?q=PAZ003&cohort='.$this->cohort->id)->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.nis', 'PAZ003');
    $this->getJson('/api/v1/academy/admin/progress?group=AKHWAT&cohort='.$this->cohort->id)->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.nis', 'PAZ004');
    $this->getJson('/api/v1/academy/admin/progress?q=not-found')->assertOk()->assertJsonCount(0, 'data.items');
    $this->getJson('/api/v1/academy/admin/progress?cohort=missing')->assertNotFound();
    $this->getJson('/api/v1/academy/admin/progress?page=999')->assertOk()->assertJsonPath('data.page', 1)->assertJsonPath('data.total', 2);
});

it('isolates cohorts hides drafts and requires participant membership in the selected cohort', function () {
    $draft = $this->quizzes[0]->replicate();
    $draft->forceFill(['id' => (string) Str::uuid(), 'isPublished' => false])->save();
    progressAttempt($this->people[0], $draft, 100);
    $other = (new Cohort)->forceFill(['title' => 'Angkatan lain']);
    $other->save();
    $this->getJson('/api/v1/academy/admin/progress?cohort='.$this->cohort->id)->assertOk()->assertJsonPath('data.totalQuizzes', 3)->assertJsonPath('data.items.0.completedQuizzes', 0);
    $this->getJson('/api/v1/academy/admin/progress?cohort='.$other->id)->assertOk()->assertJsonPath('data.total', 0);
    $this->getJson('/api/v1/academy/admin/progress/'.$this->people[0]->id.'?cohort='.$other->id)->assertNotFound();
    $this->course->forceFill(['isPublished' => false])->save();
    $this->getJson('/api/v1/academy/admin/progress?cohort='.$this->cohort->id)->assertOk()->assertJsonPath('data.totalQuizzes', 0)->assertJsonPath('data.fullyCompletedParticipants', 0);
});

it('distinguishes missed upcoming inactive in-progress and expired exams without inventing scores', function () {
    $person = $this->people[0];
    $this->quizzes[0]->forceFill(['closesAt' => now()])->save();
    $this->quizzes[1]->forceFill(['quizDate' => now()->addHour()])->save();
    $this->quizzes[2]->forceFill(['isActive' => false])->save();
    $url = '/api/v1/academy/admin/progress/'.$person->id.'?cohort='.$this->cohort->id;
    $this->getJson($url)->assertOk()->assertJsonPath('data.quizzes.0.status', 'missed')->assertJsonPath('data.quizzes.1.status', 'upcoming')->assertJsonPath('data.quizzes.2.status', 'inactive')->assertJsonPath('data.quizzes.0.score', null);
    $this->quizzes[0]->forceFill(['closesAt' => now()->addDay()])->save();
    $attempt = progressAttempt($person, $this->quizzes[0], null, false);
    $this->getJson($url)->assertOk()->assertJsonPath('data.quizzes.0.status', 'in_progress');
    $attempt->forceFill(['startedAt' => now()->subMinutes(20)])->save();
    $this->getJson($url)->assertOk()->assertJsonPath('data.quizzes.0.status', 'expired')->assertJsonPath('data.quizzes.0.score', null);
    expect($attempt->fresh()->isCompleted)->toBeFalse();
});

it('does not allow participants retired teachers editors or other module administrators to read admin progress', function (string $role) {
    $actor = $role === 'participant' ? $this->people[0]->user : progressActor('Denied '.$role);
    if ($role !== 'participant') {
        $module = $this->module;
        if ($role === 'other-admin') {
            $module = (new Module)->forceFill(['slug' => 'other-qa', 'name' => 'Other', 'isActive' => true]);
            $module->save();
        }
        DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $actor->id, 'module_id' => $module->id, 'role' => $role === 'other-admin' ? 'admin' : $role]);
    }
    Sanctum::actingAs($actor);
    $this->getJson('/api/v1/academy/admin/progress')->assertForbidden();
    $this->getJson('/api/v1/academy/admin/progress/'.$this->people[0]->id.'?cohort='.$this->cohort->id)->assertForbidden();
    $this->getJson('/api/v1/academy/teacher/grades')->assertForbidden();
})->with(['participant', 'teacher', 'editor', 'other-admin']);

it('removes teacher creation and retires unused access while preserving shared accounts and history', function () {
    expect(config('modules.account_management.academy.roles'))->not->toHaveKey('teacher');
    $teacher = progressActor('Unused teacher');
    $shared = progressActor('Shared teacher');
    $other = (new Module)->forceFill(['slug' => 'shared-qa', 'name' => 'Other', 'isActive' => true]);
    $other->save();
    foreach ([$teacher, $shared] as $u) {
        DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $u->id, 'module_id' => $this->module->id, 'role' => 'teacher']);
    }
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $shared->id, 'module_id' => $other->id, 'role' => 'admin']);
    $teacher->createToken('qa');
    $shared->createToken('qa');
    progressAttempt($this->people[0], $this->quizzes[0], 50);
    (require database_path('migrations/2026_11_18_000002_retire_academy_teacher_access.php'))->up();
    expect($teacher->fresh()->is_active)->toBeFalse()->and($shared->fresh()->is_active)->toBeTrue()
        ->and(DB::table('module_access')->where('module_id', $this->module->id)->where('role', 'teacher')->count())->toBe(0)
        ->and($teacher->tokens()->count())->toBe(0)->and($shared->tokens()->count())->toBe(1)
        ->and(Attempt::count())->toBe(1)->and(Profile::count())->toBe(2)
        ->and(DB::table('module_access')->where('user_id', $shared->id)->where('module_id', $other->id)->count())->toBe(1);
});

it('paginates large cohorts without counting only the visible page', function () {
    foreach ($this->quizzes as $quiz) {
        progressAttempt($this->people[0], $quiz, 50);
    }
    for ($i = 0; $i < 25; $i++) {
        $user = progressActor('Extra QA '.$i);
        (new Profile)->forceFill(['userId' => $user->id, 'nis' => 'ZZ'.str_pad((string) $i, 3, '0', STR_PAD_LEFT), 'cohortId' => $this->cohort->id])->save();
    }
    $this->getJson('/api/v1/academy/admin/progress?page=2&cohort='.$this->cohort->id)->assertOk()
        ->assertJsonPath('data.total', 27)->assertJsonPath('data.page', 2)->assertJsonPath('data.pages', 2)
        ->assertJsonPath('data.fullyCompletedParticipants', 1)->assertJsonCount(2, 'data.items');
});

it('keeps historical cohort memberships and inactive participants while excluding deleted profiles and administrators', function () {
    $other = (new Cohort)->forceFill(['title' => 'Current cohort']);
    $other->save();
    $this->people[0]->forceFill(['cohortId' => $other->id])->save();
    $this->people[0]->user->forceFill(['is_active' => false])->save();
    $this->people[1]->forceFill(['deletedAt' => now()])->save();
    (new Profile)->forceFill(['userId' => $this->admin->id, 'nis' => 'ADMIN-QA', 'cohortId' => $this->cohort->id])->save();
    $this->getJson('/api/v1/academy/admin/progress?cohort='.$this->cohort->id)->assertOk()
        ->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.nis', 'PAZ003')->assertJsonPath('data.items.0.active', false);
    $this->getJson('/api/v1/academy/admin/progress/'.$this->people[0]->id.'?cohort='.$this->cohort->id)->assertOk()->assertJsonPath('data.person.nis', 'PAZ003');
});

it('rejects teacher account creation through Core managed accounts', function () {
    $super = progressActor('Superadmin QA');
    $super->forceFill(['is_superadmin' => true])->save();
    Sanctum::actingAs($super);
    $this->postJson('/api/v1/core/module-accounts', ['moduleId' => $this->module->id, 'role' => 'teacher', 'name' => 'Retired role', 'password' => 'synthetic-password'])->assertUnprocessable();
});
