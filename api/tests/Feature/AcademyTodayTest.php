<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizOption as Option;
use App\Modules\Academy\Models\ZakatAcademyQuizQuestion as Question;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Core\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-12-01 12:00', 'Asia/Jakarta'));
    DB::table('modules')->insertOrIgnore(['id' => 'today-academy', 'slug' => 'academy', 'name' => 'Academy', 'is_active' => true]);
    $this->admin = (new User)->forceFill(['name' => 'Admin QA', 'password_hash' => bcrypt('test-only-password'), 'is_superadmin' => true, 'is_active' => true]);
    $this->admin->save();
    $this->cohort = new AcademyCohort;
    $this->cohort->title = 'Angkatan QA';
    $this->cohort->save();
    $this->course = (new Course)->forceFill(['cohortId' => $this->cohort->id, 'title' => 'Belajar QA', 'shortDescription' => 'Belajar QA', 'teacher' => 'Pemateri QA', 'slug' => 'course-qa', 'isPublished' => true, 'startsAt' => CarbonImmutable::parse('2026-12-01T00:00:00Z')]);
    $this->course->save();
    $this->chapter = (new Chapter)->forceFill(['courseId' => $this->course->id, 'title' => 'Materi QA', 'slug' => 'materi', 'order' => 0, 'isPublished' => true]);
    $this->chapter->save();
    $this->lessons = [];
    $this->quizzes = [];
    for ($i = 1; $i <= 12; $i++) {
        $lesson = (new Lesson)->forceFill(['chapterId' => $this->chapter->id, 'title' => 'Materi '.$i, 'slug' => 'materi-'.$i, 'order' => $i, 'releaseDay' => 1, 'isPublished' => true, 'videoProvider' => 'AUDIO', 'videoUrl' => '', 'contentSummary' => 'Bahan belajar.']);
        $lesson->save();
        $this->lessons[] = $lesson;
        $quiz = (new Quiz)->forceFill(['chapterId' => $this->chapter->id, 'title' => 'Ujian '.$i, 'kind' => 'DAILY', 'releaseDay' => $i, 'isPublished' => true, 'isActive' => true, 'allowRetake' => false, 'passingScore' => 0, 'timeLimitMinutes' => 10, 'createdAt' => CarbonImmutable::parse('2026-11-01T00:00:00Z')->addSeconds($i)]);
        $quiz->save();
        $this->quizzes[] = $quiz;
    }
    $this->final = (new Quiz)->forceFill(['chapterId' => $this->chapter->id, 'title' => 'Ujian akhir', 'kind' => 'FINAL', 'releaseDay' => 1, 'isPublished' => true, 'isActive' => true, 'allowRetake' => false, 'passingScore' => 0, 'timeLimitMinutes' => 10]);
    $this->final->save();
    $question = (new Question)->forceFill(['quizId' => $this->quizzes[0]->id, 'question' => 'Pilihan QA?', 'type' => 'SINGLE', 'weight' => 1, 'order' => 0]);
    $question->save();
    foreach ([true, false] as $i => $correct) {
        $option = (new Option)->forceFill(['questionId' => $question->id, 'label' => 'Opsi '.$i, 'isCorrect' => $correct]);
        $option->save();
    }
    $this->student = (new User)->forceFill(['name' => 'Peserta QA', 'password_hash' => bcrypt('test-only-password'), 'is_active' => true]);
    $this->student->save();
    $this->profile = (new Profile)->forceFill(['userId' => $this->student->id, 'nis' => 'QA-TODAY', 'mustChangePassword' => false]);
    $this->profile->save();
    DB::transaction(fn () => app(CohortLearning::class)->join($this->profile, $this->cohort));
    // Arbitrary manual dates: no cohort anchor is required.
    foreach ($this->lessons as $i => $lesson) {
        $start = CarbonImmutable::parse('2026-12-06 17:00', 'Asia/Jakarta')->addDays(intdiv($i, 4) * 7 + $i % 4);
        $lesson->forceFill(['dashboardOpensAt' => $start->utc(), 'dashboardClosesAt' => $start->addDay()->utc()])->save();
        $this->quizzes[$i]->forceFill(['quizDate' => $start->addDay()->utc(), 'closesAt' => $start->addDays(2)->utc(), 'releaseDay' => 1])->save();
    }
    $this->final->forceFill(['quizDate' => CarbonImmutable::parse('2027-01-01 17:00', 'Asia/Jakarta')->utc(), 'closesAt' => CarbonImmutable::parse('2027-01-03 17:00', 'Asia/Jakarta')->utc()])->save();
    Sanctum::actingAs($this->student);
});

afterEach(function () {
    $this->travelBack();
});

it('uses inclusive opening and exclusive closing with only one current item and leaves history intact', function () {
    $this->travelTo(CarbonImmutable::parse('2026-12-06 16:59:59', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material', null)->assertJsonPath('data.exam', null);
    $this->travelTo(CarbonImmutable::parse('2026-12-06 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.id', $this->lessons[0]->id)->assertJsonPath('data.exam', null);
    $this->travelTo(CarbonImmutable::parse('2026-12-07 17:00', 'Asia/Jakarta'));
    $response = $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.id', $this->lessons[1]->id)->assertJsonPath('data.exam.id', $this->quizzes[0]->id);
    expect(array_keys($response->json('data.exam')))->not->toContain('questions', 'answers');
    $this->travelTo(CarbonImmutable::parse('2026-12-10 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material', null)->assertJsonPath('data.exam.id', $this->quizzes[3]->id);
    $this->travelTo(CarbonImmutable::parse('2026-12-11 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.exam', null);
    $this->getJson('/api/v1/academy/materials/'.$this->lessons[0]->id)->assertOk();
    $items = $this->getJson('/api/v1/academy/learning/quizzes')->assertOk()->json('data');
    expect(array_column($items, 'id'))->toContain($this->quizzes[0]->id);
});

it('keeps week four empty until Friday final and expires final on Sunday at 17 WIB', function () {
    foreach (['2026-12-27 17:00', '2026-12-31 20:00', '2027-01-01 16:59:59'] as $date) {
        $this->travelTo(CarbonImmutable::parse($date, 'Asia/Jakarta'));
        $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material', null)->assertJsonPath('data.exam', null);
    }
    $this->travelTo(CarbonImmutable::parse('2027-01-01 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.exam.id', $this->final->id);
    $this->travelTo(CarbonImmutable::parse('2027-01-03 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.exam', null);
});

it('does not promote later drafts into an unpublished material slot and respects unpublished quizzes', function () {
    $this->lessons[0]->isPublished = false;
    $this->lessons[0]->save();
    $this->quizzes[0]->isPublished = false;
    $this->quizzes[0]->save();
    $this->travelTo(CarbonImmutable::parse('2026-12-06 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material', null);
    $this->getJson('/api/v1/academy/materials/'.$this->lessons[0]->id)->assertNotFound();
    $this->travelTo(CarbonImmutable::parse('2026-12-07 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.id', $this->lessons[1]->id)->assertJsonPath('data.exam', null);
});

it('saves arbitrary manual material dates and rejects invalid pairs or student edits', function () {
    $url = '/api/v1/academy/admin/materials/'.$this->lessons[0]->id;
    $input = ['dashboardOpensAt' => '2026-12-02T09:15', 'dashboardClosesAt' => '2026-12-04T11:30'];
    $this->putJson($url, $input)->assertForbidden();
    Sanctum::actingAs($this->admin);
    $this->putJson($url, $input)->assertOk();
    expect($this->lessons[0]->fresh()->dashboardOpensAt->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'))->toBe('2026-12-02 09:15');
    $this->putJson($url, ['dashboardOpensAt' => '2026-12-04T11:30', 'dashboardClosesAt' => '2026-12-02T09:15'])->assertUnprocessable();
    $this->putJson($url, ['dashboardOpensAt' => '2026-12-04T11:30'])->assertUnprocessable();
    Sanctum::actingAs($this->student);
    $this->travelTo(CarbonImmutable::parse('2026-12-02 09:15', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.id', $this->lessons[0]->id);
    $this->travelTo(CarbonImmutable::parse('2026-12-04 11:30', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material', null);
    $this->getJson('/api/v1/academy/materials/'.$this->lessons[0]->id)->assertOk();
    Sanctum::actingAs($this->admin);
    $this->putJson($url, ['isPublished' => false])->assertOk();
    expect($this->lessons[0]->fresh()->dashboardClosesAt)->not->toBeNull();
});

it('never rewrites manual exam dates even when a legacy cohort anchor exists', function () {
    $this->cohort->dashboardStartsOn = '2026-12-06';
    $this->cohort->save();
    Sanctum::actingAs($this->admin);
    foreach (['DAILY', 'WEEKLY', 'FINAL'] as $kind) {
        $input = ['chapterId' => $this->chapter->id, 'title' => 'Manual '.$kind, 'kind' => $kind, 'passingScore' => 0,
            'timeLimitMinutes' => 90, 'releaseDay' => 1, 'isPublished' => false, 'isActive' => false,
            'quizDate' => '2026-12-03T10:20', 'closesAt' => '2026-12-05T12:40'];
        $id = $this->postJson('/api/v1/academy/teacher/quizzes', $input)->assertOk()->json('data.id');
        $quiz = Quiz::findOrFail($id);
        expect($quiz->quizDate->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'))->toBe('2026-12-03 10:20');
        expect($quiz->closesAt->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'))->toBe('2026-12-05 12:40');
        expect($quiz->timeLimitMinutes)->toBe(90);
    }
});

it('selects just the latest currently open material and exam without a twelve material limit', function () {
    $this->travelTo(CarbonImmutable::parse('2026-12-07 17:00', 'Asia/Jakarta'));
    $lesson = (new Lesson)->forceFill(['chapterId' => $this->chapter->id, 'title' => 'Materi tambahan', 'slug' => 'tambahan', 'order' => 13, 'releaseDay' => 1,
        'isPublished' => true, 'videoProvider' => 'AUDIO', 'videoUrl' => '', 'dashboardOpensAt' => now()->subMinute(), 'dashboardClosesAt' => now()->addHour()]);
    $lesson->save();
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.id', $this->lessons[1]->id);
    $lesson->dashboardOpensAt = now();
    $lesson->save();
    $this->lessons[1]->dashboardOpensAt = now()->subMinute();
    $this->lessons[1]->save();
    $this->quizzes[1]->forceFill(['quizDate' => now()->subMinute(), 'closesAt' => now()->addHour()])->save();
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.id', $lesson->id)->assertJsonPath('data.exam.id', $this->quizzes[0]->id);
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.material.number', 13);
});

it('never uses query selectors to expose another cohort or participant', function () {
    $outsider = (new User)->forceFill(['name' => 'Peserta lain', 'password_hash' => bcrypt('test-only-password'), 'is_active' => true]);
    $outsider->save();
    $profile = (new Profile)->forceFill(['userId' => $outsider->id, 'nis' => 'QA-OTHER', 'mustChangePassword' => false]);
    $profile->save();
    Sanctum::actingAs($outsider);
    $this->travelTo(CarbonImmutable::parse('2026-12-07 17:00', 'Asia/Jakarta'));
    $this->getJson('/api/v1/academy/learning/today?profileId='.$this->profile->id.'&cohort='.$this->cohort->id)
        ->assertOk()->assertJsonPath('data.material', null)->assertJsonPath('data.exam', null);
    $profile->mustChangePassword = true;
    $profile->save();
    $this->getJson('/api/v1/academy/learning/today')->assertForbidden();
});


it('lists participant exams in the same creation order as admin regardless of deadlines and release days', function () {
    $this->quizzes[0]->forceFill(['quizDate' => now()->subDays(3), 'closesAt' => now()->subDays(2), 'releaseDay' => 3])->save();
    $this->quizzes[1]->forceFill(['quizDate' => now()->addDays(2), 'closesAt' => now()->addDays(3), 'releaseDay' => 1])->save();
    $this->quizzes[2]->forceFill(['quizDate' => now()->addDay(), 'closesAt' => now()->addDays(2), 'releaseDay' => 2])->save();
    $rows = $this->getJson('/api/v1/academy/learning/quizzes?cohort='.$this->cohort->id)->assertOk()->json('data');
    $daily = collect($rows)->where('kind', 'DAILY')->pluck('id')->values()->all();
    expect($daily)->toBe(array_map(fn ($quiz) => $quiz->id, $this->quizzes));
});
