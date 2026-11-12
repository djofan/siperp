<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\AcademyCohortMembership;
use App\Modules\Academy\Models\AcademyDiscussion;
use App\Modules\Academy\Models\AcademyLiveSession;
use App\Modules\Academy\Models\ZakatAcademyLesson;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Models\ZakatAcademyQuiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt;
use App\Modules\Academy\Models\ZakatAcademyQuizOption;
use App\Modules\Academy\Models\ZakatAcademyQuizQuestion;
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

it('prepares twelve chapters for new and existing cohorts without duplicates', function () {
    $id = $this->postJson('/api/v1/academy/admin/cohorts', ['title' => 'Angkatan baru'])->assertSuccessful()->json('data.id');
    $courseId = $this->postJson('/api/v1/academy/admin/cohorts/'.$id.'/chapters')->assertSuccessful()->json('data.courseId');
    $this->postJson('/api/v1/academy/admin/cohorts/'.$id.'/chapters')->assertSuccessful();
    expect(DB::table('zakat_academy_chapters')->where('course_id', $courseId)->count())->toBe(12);
    expect((int) DB::table('zakat_academy_courses')->where('id', $courseId)->value('duration_days'))->toBe(30);
    $student = scopedStudent($this->first, 'no-admin@scope.test');
    Sanctum::actingAs($student->user);
    $this->postJson('/api/v1/academy/admin/cohorts/'.$id.'/chapters')->assertForbidden();
});

it('saves teacher audio and publication atomically and keeps audio during text edits', function () {
    Storage::fake('local');
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $wav = 'RIFF'.pack('V', 36).'WAVEfmt '.str_repeat(chr(0), 32);
    $id = $this->post('/api/v1/academy/teacher/materials', [
        'chapterId' => $chapter->id, 'title' => 'Rekaman', 'order' => 1, 'isPublished' => 'on',
        'file' => UploadedFile::fake()->createWithContent('rekaman.wav', $wav),
    ], ['Accept' => 'application/json'])->assertSuccessful()->json('data.id');
    $lesson = ZakatAcademyLesson::findOrFail($id);
    expect($lesson->isPublished)->toBeTrue()->and($lesson->videoUrl)->toStartWith('/api/academy/files/');
    $url = $lesson->videoUrl;
    $this->postJson('/api/v1/academy/teacher/materials/'.$id, [
        'chapterId' => $chapter->id, 'title' => 'Edit teks', 'order' => 1, 'contentSummary' => 'Teks', 'isPublished' => true,
    ])->assertSuccessful();
    expect($lesson->fresh()->videoUrl)->toBe($url);
    $count = ZakatAcademyLesson::count();
    $this->post('/api/v1/academy/teacher/materials', [
        'chapterId' => $chapter->id, 'title' => 'File salah', 'order' => 2, 'isPublished' => 'on',
        'file' => UploadedFile::fake()->createWithContent('palsu.mp3', 'not audio'),
    ], ['Accept' => 'application/json'])->assertUnprocessable();
    expect(ZakatAcademyLesson::count())->toBe($count);
});

it('accepts browser WebM recordings through the teacher form', function () {
    Storage::fake('local');
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $bytes = hex2bin('1a45dfa3').str_repeat(chr(0), 8).'webm'.str_repeat(chr(0), 32);
    $id = $this->post('/api/v1/academy/teacher/materials', [
        'chapterId' => $chapter->id, 'title' => 'Rekam browser', 'order' => 1, 'isPublished' => 'on',
        'file' => UploadedFile::fake()->createWithContent('rekaman.webm', $bytes),
    ], ['Accept' => 'application/json'])->assertSuccessful()->json('data.id');
    expect(ZakatAcademyLesson::findOrFail($id)->attachments()->first()->fileType)->toBe('audio/webm');
});

it('automatically appends daily teacher materials and preserves their order on edit', function () {
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $payload = ['chapterId' => $chapter->id, 'title' => 'Hari pertama', 'contentSummary' => 'Teks', 'isPublished' => true];
    $first = $this->postJson('/api/v1/academy/teacher/materials', $payload)->assertSuccessful()->json('data.id');
    $second = $this->postJson('/api/v1/academy/teacher/materials', array_merge($payload, ['title' => 'Hari kedua', 'order' => 0, 'releaseDay' => 30]))->assertSuccessful()->json('data.id');
    expect(ZakatAcademyLesson::findOrFail($first)->order)->toBe(1)
        ->and(ZakatAcademyLesson::findOrFail($second)->order)->toBe(2)
        ->and(ZakatAcademyLesson::findOrFail($second)->releaseDay)->toBe(1);
    $this->postJson('/api/v1/academy/teacher/materials/'.$first, $payload + ['order' => 99])->assertSuccessful();
    expect(ZakatAcademyLesson::findOrFail($first)->order)->toBe(1);
});

it('paginates and filters teacher materials by their actual cohort', function () {
    $firstChapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $secondChapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->second->id));
    foreach (range(1, 14) as $i) {
        $lesson = new ZakatAcademyLesson;
        $lesson->forceFill(['chapterId' => $i <= 12 ? $firstChapter->id : $secondChapter->id,
            'title' => 'Materi '.$i, 'slug' => 'materi-'.$i, 'order' => $i,
            'isPublished' => $i % 2 === 0, 'contentSummary' => 'Detail '.$i, 'videoUrl' => '', 'videoProvider' => 'AUDIO'])->save();
    }
    $base = '/api/v1/academy/teacher/materials?view=table';
    $this->getJson($base)->assertSuccessful()->assertJsonPath('data.total', 14)
        ->assertJsonPath('data.lastPage', 2)->assertJsonCount(10, 'data.items');
    $this->getJson($base.'&page=2')->assertSuccessful()->assertJsonCount(4, 'data.items');
    $filtered = $base.'&cohort='.$this->first->id;
    $result = $this->getJson($filtered.'&page=2')->assertSuccessful()->assertJsonPath('data.total', 12)
        ->assertJsonCount(2, 'data.items')->assertJsonPath('data.items.0.cohortTitle', $this->first->title);
    expect(collect($result->json('data.items'))->pluck('chapterId')->unique()->all())->toBe([$firstChapter->id]);
    $this->getJson($base.'&cohort=missing')->assertSuccessful()->assertJsonCount(0, 'data.items')->assertJsonPath('data.lastPage', 1);
    $this->getJson($base.'&page=999')->assertJsonPath('data.page', 2);
    $this->getJson($base.'&page=0')->assertUnprocessable();
    $this->getJson('/api/v1/academy/teacher/materials')->assertSuccessful()->assertJsonStructure(['data' => [['id', 'lessons']]]);
    $student = scopedStudent($this->first, 'table-student@scope.test');
    Sanctum::actingAs($student->user);
    $this->getJson($base)->assertForbidden();
});

it('paginates exams by cohort and questions within the selected exam without exposing keys to students', function () {
    $first = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $second = DB::transaction(fn () => app(CohortLearning::class)->container($this->second->id));
    $quizzes = [];
    foreach (range(1, 13) as $i) {
        $quiz = new ZakatAcademyQuiz;
        $quiz->forceFill(['chapterId' => $i <= 11 ? $first->id : $second->id,
            'title' => 'Ujian '.$i, 'kind' => 'DAILY', 'isPublished' => false, 'isActive' => false])->save();
        $quizzes[] = $quiz;
    }
    $quiz = $quizzes[0];
    foreach (range(1, 12) as $i) {
        $question = new ZakatAcademyQuizQuestion;
        $question->forceFill(['quizId' => $quiz->id, 'question' => 'Pertanyaan '.$i, 'order' => $i, 'type' => 'SINGLE', 'weight' => 1])->save();
        $option = new ZakatAcademyQuizOption;
        $option->forceFill(['questionId' => $question->id, 'label' => 'Kunci '.$i, 'isCorrect' => true])->save();
    }
    $list = '/api/v1/academy/teacher/quizzes?view=table';
    $this->getJson($list)->assertSuccessful()->assertJsonPath('data.total', 13)->assertJsonCount(10, 'data.items');
    $this->getJson($list.'&page=2')->assertJsonCount(3, 'data.items');
    $this->getJson($list.'&cohort='.$this->second->id)->assertJsonPath('data.total', 2)->assertJsonPath('data.items.0.cohortTitle', $this->second->title);
    $this->getJson($list.'&cohort=missing')->assertJsonCount(0, 'data.items');
    $this->getJson($list.'&page=0')->assertUnprocessable();
    $detail = '/api/v1/academy/teacher/quizzes/'.$quiz->id.'?view=table';
    $this->getJson($detail)->assertSuccessful()->assertJsonPath('data.pagination.total', 12)
        ->assertJsonCount(10, 'data.quiz.questions')->assertJsonPath('data.quiz.questions.0.options.0.isCorrect', true);
    $this->getJson($detail.'&page=2')->assertJsonCount(2, 'data.quiz.questions')->assertJsonPath('data.quiz.questions.0.question', 'Pertanyaan 11');
    $this->getJson($detail.'&page=999')->assertJsonPath('data.pagination.page', 2);
    $this->getJson($detail.'&page=0')->assertUnprocessable();
    $this->getJson('/api/v1/academy/teacher/quizzes/'.$quiz->id)->assertJsonCount(12, 'data.quiz.questions');
    $student = scopedStudent($this->first, 'exam-table-student@scope.test');
    Sanctum::actingAs($student->user);
    $this->getJson($list)->assertForbidden();
    $this->getJson($detail)->assertForbidden()->assertJsonMissingPath('data.quiz.questions');
});

it('requires a chapter only for daily teacher exams and accepts cohort curriculum for weekly and final', function () {
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $other = DB::transaction(fn () => app(CohortLearning::class)->container($this->second->id));
    $data = ['title' => 'Ujian', 'passingScore' => 70, 'timeLimitMinutes' => 30, 'isPublished' => false, 'isActive' => false];
    $this->postJson('/api/v1/academy/teacher/quizzes', $data + ['kind' => 'DAILY', 'courseId' => $chapter->courseId])->assertUnprocessable();
    $this->postJson('/api/v1/academy/teacher/quizzes', $data + ['kind' => 'DAILY', 'courseId' => $other->courseId, 'chapterId' => $chapter->id])->assertUnprocessable();
    $this->postJson('/api/v1/academy/teacher/quizzes', $data + ['kind' => 'DAILY', 'chapterId' => $chapter->id])->assertSuccessful();
    foreach (['WEEKLY', 'FINAL'] as $kind) {
        $id = $this->postJson('/api/v1/academy/teacher/quizzes', $data + ['kind' => $kind, 'courseId' => $chapter->courseId])->assertSuccessful()->json('data.id');
        expect(ZakatAcademyQuiz::findOrFail($id)->chapter->courseId)->toBe($chapter->courseId);
        $this->postJson('/api/v1/academy/teacher/quizzes/'.$id, $data + ['kind' => $kind])->assertSuccessful();
        $this->postJson('/api/v1/academy/teacher/quizzes', $data + ['kind' => $kind])->assertUnprocessable();
    }
});

it('shows latest published materials chronologically without crossing cohort boundaries', function () {
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $other = DB::transaction(fn () => app(CohortLearning::class)->container($this->second->id));
    foreach ([
        ['Older', $chapter->id, true, now()->subDays(2), 1],
        ['Newest', $chapter->id, true, now()->subDay(), 99],
        ['Private draft', $chapter->id, false, now(), 1],
        ['Other cohort', $other->id, true, now(), 1],
    ] as [$title, $chapterId, $published, $created, $order]) {
        (new ZakatAcademyLesson)->forceFill(['chapterId' => $chapterId, 'title' => $title,
            'slug' => Str::uuid(), 'isPublished' => $published, 'createdAt' => $created,
            'order' => $order, 'videoProvider' => 'AUDIO', 'videoUrl' => '', 'contentSummary' => 'Text'])->save();
    }
    $student = scopedStudent($this->first, 'latest-student@scope.test');
    Sanctum::actingAs($student->user);
    $result = $this->getJson('/api/v1/academy/materials?sort=latest')->assertSuccessful()->assertJsonPath('data.total', 2);
    expect(collect($result->json('data.items'))->pluck('title')->all())->toBe(['Newest', 'Older']);
});

it('paginates teacher discussions and protects question detail and answer mutation', function () {
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $profile = scopedStudent($this->first, 'discussion-student@scope.test');
    $ids = [];
    foreach (range(1, 12) as $i) {
        $row = new AcademyDiscussion;
        $row->forceFill(['profileId' => $profile->id, 'courseId' => $chapter->courseId, 'question' => 'Pertanyaan '.$i, 'createdAt' => now()->subMinutes($i)])->save();
        $ids[] = $row->id;
    }
    $base = '/api/v1/academy/teacher/questions';
    $this->getJson($base.'?view=table')->assertSuccessful()->assertJsonPath('data.total', 12)->assertJsonCount(10, 'data.items');
    $this->getJson($base.'?view=table&page=2')->assertJsonCount(2, 'data.items');
    $this->getJson($base.'/'.$ids[0])->assertSuccessful()->assertJsonPath('data.question', 'Pertanyaan 1')->assertJsonMissingPath('data.profile.phone');
    $this->putJson('/api/v1/academy/discussions/'.$ids[0].'/answer', ['answer' => 'Jawaban pengajar'])->assertSuccessful();
    $this->getJson($base.'/'.$ids[0])->assertJsonPath('data.answer', 'Jawaban pengajar');
    $this->putJson('/api/v1/academy/discussions/'.$ids[0].'/answer', ['answer' => ''])->assertUnprocessable();
    $this->getJson($base.'/missing')->assertNotFound();
    Sanctum::actingAs($profile->user);
    $this->getJson($base.'/'.$ids[0])->assertForbidden();
    $this->putJson('/api/v1/academy/discussions/'.$ids[0].'/answer', ['answer' => 'Unauthorized'])->assertForbidden();
});

it('keeps participant discussion tables and detail private to their owner', function () {
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $owner = scopedStudent($this->first, 'discussion-owner@scope.test');
    $other = scopedStudent($this->first, 'discussion-other@scope.test');
    $row = new AcademyDiscussion;
    $row->forceFill(['profileId' => $owner->id, 'courseId' => $chapter->courseId, 'question' => 'Private question', 'answer' => 'Private answer'])->save();
    Sanctum::actingAs($owner->user);
    $this->getJson('/api/v1/academy/learning/discussions?view=table')->assertSuccessful()->assertJsonPath('data.questions.total', 1);
    $this->getJson('/api/v1/academy/learning/discussions/'.$row->id)->assertSuccessful()->assertJsonPath('data.answer', 'Private answer');
    $this->postJson('/api/v1/academy/courses/'.$chapter->courseId.'/questions', ['question' => 'New participant question'])->assertSuccessful();
    $this->postJson('/api/v1/academy/courses/'.$chapter->courseId.'/questions', ['question' => 'short'])->assertUnprocessable();
    Sanctum::actingAs($other->user);
    $this->getJson('/api/v1/academy/learning/discussions?view=table')->assertJsonPath('data.questions.total', 0);
    $this->getJson('/api/v1/academy/learning/discussions/'.$row->id)->assertNotFound()->assertJsonMissingPath('data.answer');
});

it('creates live sessions in WIB and shows them only to enrolled participants', function () {
    $chapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->first->id));
    $otherChapter = DB::transaction(fn () => app(CohortLearning::class)->container($this->second->id));
    $date = now()->addDays(2)->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i');
    $url = '/api/v1/academy/courses/'.$chapter->courseId.'/sessions';
    $payload = ['title' => 'Diskusi angkatan pertama', 'startsAt' => $date, 'joinUrl' => 'https://meet.google.com/test-room'];
    $this->postJson($url, $payload)->assertSuccessful();
    $this->getJson('/api/v1/academy/teacher/sessions')->assertSuccessful()->assertJsonPath('data.sessions.total', 1);
    $row = AcademyLiveSession::firstOrFail();
    expect($row->startsAt->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i'))->toBe($date);
    $this->postJson($url, array_replace($payload, ['startsAt' => now()->subDay()->format('Y-m-d\TH:i')]))->assertUnprocessable();
    $this->postJson($url, array_replace($payload, ['joinUrl' => 'javascript:alert(1)']))->assertUnprocessable();
    $member = scopedStudent($this->first, 'session-member@scope.test');
    $foreign = scopedStudent($this->second, 'session-other@scope.test');
    Sanctum::actingAs($member->user);
    $this->getJson('/api/v1/academy/learning/discussions?view=table')->assertJsonPath('data.enrollments.0.course.sessions.0.title', 'Diskusi angkatan pertama');
    $this->postJson($url, $payload)->assertForbidden();
    $this->getJson('/api/v1/academy/teacher/sessions')->assertForbidden();
    Sanctum::actingAs($foreign->user);
    $this->getJson('/api/v1/academy/learning/discussions?view=table')->assertJsonCount(0, 'data.enrollments.0.course.sessions');
});
