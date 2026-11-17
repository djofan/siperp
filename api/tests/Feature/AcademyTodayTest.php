<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizOption as Option;
use App\Modules\Academy\Models\ZakatAcademyQuizQuestion as Question;
use App\Modules\Academy\Services\AcademyTimetable;
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
    Sanctum::actingAs($this->admin);
    $this->putJson('/api/v1/academy/admin/cohorts/'.$this->cohort->id.'/dashboard-schedule', ['startsOn' => '2026-12-06'])->assertOk();
    Sanctum::actingAs($this->student);
});

afterEach(function () {
    $this->travelBack();
});

it('schedules twelve material windows and daily exams with the correct weekday offsets', function () {
    foreach ([1 => 0, 2 => 1, 4 => 3, 5 => 7, 8 => 10, 9 => 14, 12 => 17] as $number => $days) {
        [$start,$end] = app(AcademyTimetable::class)->materialWindow('2026-12-06', $number);
        expect($start->setTimezone('Asia/Jakarta')->format('H:i'))->toBe('17:00');
        expect($start->diffInHours($end))->toEqual(24);
        $quiz = $this->quizzes[$number - 1]->fresh();
        expect($quiz->quizDate->equalTo($start->addDay()))->toBeTrue();
        expect($quiz->closesAt->equalTo($end->addDay()))->toBeTrue();
        $this->travelTo($start);
        $this->getJson('/api/v1/academy/learning/today')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('data.material.number', $number);
    }
    expect($this->final->fresh()->quizDate->setTimezone('Asia/Jakarta')->format('l H:i'))->toBe('Friday 17:00');
    expect($this->final->fresh()->closesAt->setTimezone('Asia/Jakarta')->format('l H:i'))->toBe('Sunday 17:00');
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

it('denies schedule changes to students and blocks moving the timetable after an attempt starts', function () {
    $url = '/api/v1/academy/admin/cohorts/'.$this->cohort->id.'/dashboard-schedule';
    $this->putJson($url, ['startsOn' => '2026-12-13'])->assertForbidden();
    Sanctum::actingAs($this->admin);
    $this->putJson($url, ['startsOn' => '2026-12-07'])->assertUnprocessable();
    Sanctum::actingAs($this->student);
    $this->travelTo(CarbonImmutable::parse('2026-12-07 16:59:59', 'Asia/Jakarta'));
    $this->postJson('/api/v1/academy/quizzes/'.$this->quizzes[0]->id.'/attempts')->assertForbidden();
    $this->travelTo(CarbonImmutable::parse('2026-12-07 17:00', 'Asia/Jakarta'));
    $this->postJson('/api/v1/academy/quizzes/'.$this->quizzes[0]->id.'/attempts')->assertCreated();
    Sanctum::actingAs($this->admin);
    $this->putJson($url, ['startsOn' => '2026-12-13'])->assertConflict();
    $this->putJson($url, ['startsOn' => null])->assertConflict();
});

it('schedules later draft exams automatically and rolls back excess daily exams', function () {
    $this->quizzes[11]->delete();
    Sanctum::actingAs($this->admin);
    $input = ['chapterId' => $this->chapter->id, 'title' => 'Ujian baru', 'kind' => 'DAILY', 'passingScore' => 0,
        'timeLimitMinutes' => 10, 'releaseDay' => 30, 'isPublished' => false, 'isActive' => false];
    $id = $this->postJson('/api/v1/academy/teacher/quizzes', $input)->assertOk()->json('data.id');
    $quiz = Quiz::findOrFail($id);
    expect($quiz->quizDate->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'))->toBe('2026-12-24 17:00');
    expect($quiz->releaseDay)->toBe(12);
    $this->postJson('/api/v1/academy/teacher/quizzes', $input)->assertUnprocessable();
    expect(Quiz::where('kind', 'DAILY')->count())->toBe(12);
});

it('keeps an attempted automatic deadline when the administrator unpublishes the exam', function () {
    $this->travelTo(CarbonImmutable::parse('2026-12-07 17:00', 'Asia/Jakarta'));
    $this->postJson('/api/v1/academy/quizzes/'.$this->quizzes[0]->id.'/attempts')->assertCreated();
    $end = $this->quizzes[0]->fresh()->closesAt;
    Sanctum::actingAs($this->admin);
    $this->postJson('/api/v1/academy/teacher/quizzes/'.$this->quizzes[0]->id, [
        'chapterId' => $this->chapter->id, 'title' => 'Ujian nonaktif', 'kind' => 'DAILY', 'passingScore' => 0,
        'timeLimitMinutes' => 10, 'isPublished' => false, 'isActive' => false,
    ])->assertOk();
    expect($this->quizzes[0]->fresh()->closesAt->equalTo($end))->toBeTrue();
    Sanctum::actingAs($this->student);
    $this->getJson('/api/v1/academy/learning/today')->assertJsonPath('data.exam', null);
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
