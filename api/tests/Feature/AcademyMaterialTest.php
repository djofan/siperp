<?php

use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyLesson;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $admin = new User;
    $admin->forceFill(['name' => 'Editor', 'email' => 'editor@material.test', 'password_hash' => bcrypt('test-password'), 'is_superadmin' => true, 'is_active' => true])->save();
    Sanctum::actingAs($admin);
    $cohort = new \App\Modules\Academy\Models\AcademyCohort;
    $cohort->title = 'Angkatan Audio';
    $cohort->save();
    (new Module)->forceFill(['slug' => 'academy', 'name' => 'Academy', 'isActive' => true])->save();
});

function materialInput(array $extra = []): array
{
    return $extra + ['cohortId' => \App\Modules\Academy\Models\AcademyCohort::firstOrFail()->id, 'title' => 'Pengantar Zakat', 'slug' => 'pengantar-zakat', 'order' => 1, 'videoProvider' => 'AUDIO', 'contentSummary' => 'Teks materi peserta', 'releaseDay' => 1];
}

it('creates edits and lists materials without requiring a program or chapter input', function () {
    $id = $this->postJson('/api/v1/academy/admin/materials', materialInput(['order' => 2]))->assertSuccessful()->json('data.id');
    $this->postJson('/api/v1/academy/admin/materials', materialInput(['title' => 'Materi kedua', 'slug' => 'materi-kedua', 'order' => 1]))->assertSuccessful();
    expect(ZakatAcademyCourse::count())->toBe(1);
    $this->getJson('/api/v1/academy/admin/materials')->assertJsonPath('data.total', 2)->assertJsonPath('data.items.0.title', 'Materi kedua');
    $this->putJson('/api/v1/academy/admin/materials/'.$id, materialInput(['title' => 'Pengantar terbaru', 'isPublished' => true]))->assertSuccessful();
    $this->getJson('/api/v1/academy/admin/materials/'.$id)->assertJsonPath('data.title', 'Pengantar terbaru');
    $this->getJson('/api/v1/academy/materials')->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.id', $id)->assertJsonMissingPath('data.items.0.contentSummary');
});

it('keeps drafts private and validates material content before publishing', function () {
    $id = $this->postJson('/api/v1/academy/admin/materials', materialInput())->json('data.id');
    $this->getJson('/api/v1/academy/materials/'.$id)->assertNotFound();
    $this->postJson('/api/v1/academy/admin/materials', materialInput(['slug' => 'kosong', 'contentSummary' => '', 'isPublished' => true]))->assertUnprocessable();
    $this->getJson('/api/v1/academy/admin/materials?search=Pengantar&status=draft')->assertJsonPath('data.total', 1);
});

it('starts published materials and preserves participant progress when the editor changes content', function () {
    $id = $this->postJson('/api/v1/academy/admin/materials', materialInput(['isPublished' => true]))->json('data.id');
    $admin = User::firstOrFail();
    $user = new User;
    $user->forceFill(['name' => 'Student', 'email' => 'student@material.test', 'password_hash' => bcrypt('test-password'), 'is_active' => true])->save();
    $profile = new ZakatAcademyProfile;
    $profile->userId = $user->id;
    $profile->save();
    app(\App\Modules\Academy\Services\CohortLearning::class)->join($profile, \App\Modules\Academy\Models\AcademyCohort::firstOrFail());
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/academy/materials/'.$id.'/start')->assertSuccessful();
    $this->postJson('/api/v1/academy/materials/'.$id.'/start')->assertSuccessful();
    expect($profile->enrollments()->count())->toBe(1);
    $this->putJson('/api/v1/academy/lessons/'.$id.'/progress', ['completed' => true])->assertSuccessful();
    $this->postJson('/api/v1/academy/admin/materials', materialInput(['slug' => 'forbidden']))->assertForbidden();
    Sanctum::actingAs($admin);
    $this->putJson('/api/v1/academy/admin/materials/'.$id, materialInput(['contentSummary' => 'Materi diperbarui', 'isPublished' => true]))->assertSuccessful();
    expect($profile->lessonProgress()->where('lesson_id', $id)->firstOrFail()->completed)->toBeTrue();
    $this->deleteJson('/api/v1/academy/admin/materials/'.$id)->assertConflict();
});

it('creates quizzes directly without asking the editor to choose a chapter', function () {
    $response = $this->postJson('/api/v1/academy/admin/material-quizzes', ['cohortId' => \App\Modules\Academy\Models\AcademyCohort::firstOrFail()->id, 'title' => 'Kuis langsung', 'passingScore' => 70, 'timeLimitMinutes' => 10, 'releaseDay' => 1, 'kind' => 'DAILY'])->assertSuccessful();
    expect($response->json('data.id'))->toBeString()->and($response->json('data.chapterId'))->toBeString();
    expect(ZakatAcademyLesson::count())->toBe(0);
});

it('saves the four-field audio form without clearing the uploaded file or publication', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    $fields = ['cohortId' => \App\Modules\Academy\Models\AcademyCohort::firstOrFail()->id, 'title' => 'Audio Baru', 'order' => 2, 'shortDescription' => 'Pengantar audio', 'videoProvider' => 'AUDIO'];
    $id = $this->postJson('/api/v1/academy/admin/materials', $fields)->assertSuccessful()->json('data.id');
    $lesson = ZakatAcademyLesson::findOrFail($id);
    expect($lesson->slug)->toStartWith('audio-baru-')->and($lesson->isPublished)->toBeFalse();
    $upload = $this->post('/api/v1/academy/upload', [
        'lessonId' => $id, 'audioOnly' => '1',
        'file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('materi.mp3', 'ID3'.str_repeat('a', 64)),
    ], ['Accept' => 'application/json'])->assertSuccessful();
    $url = $upload->json('fileUrl');
    $this->putJson('/api/v1/academy/admin/materials/'.$id, ['isPublished' => true])->assertSuccessful();
    $this->putJson('/api/v1/academy/admin/materials/'.$id, array_replace($fields, ['title' => 'Audio Diperbarui']))->assertSuccessful();
    $lesson->refresh();
    expect($lesson->videoUrl)->toBe($url)->and($lesson->isPublished)->toBeTrue()->and($lesson->title)->toBe('Audio Diperbarui');
    $this->post('/api/v1/academy/upload', [
        'lessonId' => $id, 'audioOnly' => '1',
        'file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('dokumen.pdf', '%PDF-'.str_repeat('a', 64)),
    ], ['Accept' => 'application/json'])->assertUnprocessable();
    expect($lesson->fresh()->videoUrl)->toBe($url);
});

it('creates and publishes a material with an audio upload in a single request', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    $cohort = \App\Modules\Academy\Models\AcademyCohort::firstOrFail();
    $response = $this->post('/api/v1/academy/admin/materials', [
        'cohortId' => $cohort->id, 'title' => 'Audio langsung', 'order' => 1,
        'shortDescription' => 'Belajar bersama', 'videoProvider' => 'AUDIO', 'isPublished' => 'on',
        'file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('langsung.mp3', 'ID3'.str_repeat('a', 64)),
    ], ['Accept' => 'application/json'])->assertSuccessful();
    $lesson = ZakatAcademyLesson::findOrFail($response->json('data.id'));
    expect($lesson->isPublished)->toBeTrue()->and($lesson->videoUrl)->toStartWith('/api/academy/files/')->and($lesson->attachments()->count())->toBe(1);
    $this->getJson('/api/v1/academy/admin/materials?all=1')
        ->assertSuccessful()->assertJsonPath('data.items.0.attachments.0.title', 'langsung.mp3')
        ->assertJsonPath('data.items.0.videoUrl', $lesson->videoUrl)
        ->assertJsonMissingPath('data.items.0.attachments.0.storagePath');
    $this->getJson('/api/v1/academy/materials')->assertSuccessful()
        ->assertJsonMissingPath('data.items.0.attachments')->assertJsonMissingPath('data.items.0.videoUrl');
    $this->getJson('/api/v1/academy/materials/'.$lesson->id)->assertSuccessful();
    $this->post('/api/v1/academy/admin/materials', [
        'cohortId' => $cohort->id, 'title' => 'File tidak valid', 'order' => 1, 'isPublished' => 'on',
        'file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('dokumen.pdf', '%PDF-'.str_repeat('a', 64)),
    ], ['Accept' => 'application/json'])->assertUnprocessable();
    expect(ZakatAcademyLesson::count())->toBe(1)->and(count(\Illuminate\Support\Facades\Storage::disk('local')->allFiles('academy')))->toBe(1);
});

it('starts new cohorts at one and rejects zero material order', function () {
    $cohort = \App\Modules\Academy\Models\AcademyCohort::firstOrFail();
    $this->getJson('/api/v1/academy/admin/materials?cohort='.$cohort->id)->assertSuccessful()->assertJsonPath('data.nextOrder', 1);
    $this->postJson('/api/v1/academy/admin/materials', materialInput(['order' => 0]))->assertUnprocessable();
});

function singleExamInput(array $extra = []): array
{
    return $extra + ['cohortId' => \App\Modules\Academy\Models\AcademyCohort::firstOrFail()->id,
        'title' => 'Ujian terpadu', 'passingScore' => 70, 'timeLimitMinutes' => 5,
        'kind' => 'DAILY', 'question' => 'Pilih jawaban benar', 'type' => 'SINGLE',
        'options' => json_encode([['id' => '', 'label' => 'Benar', 'isCorrect' => true], ['id' => '', 'label' => 'Salah', 'isCorrect' => false]])];
}

it('saves and publishes one exam and one question atomically', function () {
    $result = $this->postJson('/api/v1/academy/admin/exams', singleExamInput(['isPublished' => true, 'isActive' => true]))->assertSuccessful()->json('data');
    $quiz = \App\Modules\Academy\Models\ZakatAcademyQuiz::findOrFail($result['id']);
    expect($quiz->questions()->count())->toBe(1)->and($quiz->isPublished)->toBeTrue()->and($quiz->isActive)->toBeTrue();
    $question = $quiz->questions()->with('options')->firstOrFail();
    expect($question->options->count())->toBe(2);
    $this->getJson('/api/v1/academy/admin/quizzes?all=1')->assertSuccessful()
        ->assertJsonPath('data.items.0.questions.0.type', 'SINGLE')
        ->assertJsonMissingPath('data.items.0.questions.0.options');
    $options = $question->options->map(fn ($option) => ['id' => $option->id, 'label' => $option->label, 'isCorrect' => $option->isCorrect])->all();
    $this->postJson('/api/v1/academy/admin/exams/'.$quiz->id, singleExamInput(['title' => 'Judul diperbarui', 'question' => 'Pertanyaan diperbarui', 'options' => json_encode($options)]))->assertSuccessful();
    expect($quiz->fresh()->title)->toBe('Judul diperbarui')->and($quiz->questions()->count())->toBe(1)->and($question->fresh()->question)->toBe('Pertanyaan diperbarui');
    $this->postJson('/api/v1/academy/admin/courses/'.$result['courseId'].'/chapters/'.$result['chapterId'].'/quizzes/'.$quiz->id.'/questions', [
        'question' => 'Pertanyaan kedua', 'order' => 2, 'options' => array_map(fn ($o) => array_replace($o, ['id' => '']), $options),
    ])->assertSuccessful();
    expect($quiz->questions()->count())->toBe(2);
    $this->postJson('/api/v1/academy/admin/exams/'.$quiz->id, singleExamInput(['questions' => [['id' => 'not-owned-by-this-exam']]]))->assertUnprocessable();
    expect($quiz->questions()->count())->toBe(2);
});

it('saves edits adds and removes multiple questions in one multipart submission', function () {
    $question = ['id' => '', 'question' => 'Pertanyaan 1', 'type' => 'SINGLE', 'options' => singleExamInput()['options']];
    $second = array_replace($question, ['question' => 'Pertanyaan 2', 'type' => 'TRUE_FALSE']);
    $input = singleExamInput(['isActive' => 'on', 'questions' => [$question, $second]]);
    $result = $this->post('/api/v1/academy/admin/exams', $input, ['Accept' => 'application/json'])->assertSuccessful()->json('data');
    $quiz = \App\Modules\Academy\Models\ZakatAcademyQuiz::findOrFail($result['id']);
    $rows = $quiz->questions()->with('options')->orderBy('order')->get();
    expect($rows->count())->toBe(2)->and($rows->pluck('order')->all())->toBe([1, 2])->and($quiz->isActive)->toBeTrue();
    $keep = $rows[1];
    $options = $keep->options->map(fn ($o) => ['id' => $o->id, 'label' => $o->label, 'isCorrect' => $o->isCorrect])->all();
    $updated = array_replace($second, ['id' => $keep->id, 'question' => 'Pertanyaan diperbarui', 'options' => json_encode($options)]);
    $this->post('/api/v1/academy/admin/exams/'.$quiz->id, singleExamInput(['questions' => [$updated, array_replace($question, ['question' => 'Pertanyaan 3'])]]), ['Accept' => 'application/json'])->assertSuccessful();
    expect($quiz->questions()->orderBy('order')->pluck('question')->all())->toBe(['Pertanyaan diperbarui', 'Pertanyaan 3']);
    expect($quiz->questions()->where('id', $rows[0]->id)->exists())->toBeFalse()->and($keep->fresh()->id)->toBe($keep->id);
    $this->postJson('/api/v1/academy/admin/exams/'.$quiz->id, singleExamInput(['questions' => []]))->assertUnprocessable();
    expect($quiz->questions()->count())->toBe(2);
});

it('rolls back every question and exam change if a later question is invalid', function () {
    $question = ['id' => '', 'question' => 'Valid', 'type' => 'SINGLE', 'options' => singleExamInput()['options']];
    $invalid = array_replace($question, ['options' => json_encode([['id' => '', 'label' => 'A', 'isCorrect' => false], ['id' => '', 'label' => 'B', 'isCorrect' => false]])]);
    $this->postJson('/api/v1/academy/admin/exams', singleExamInput(['questions' => [$question, $invalid]]))->assertUnprocessable();
    expect(\App\Modules\Academy\Models\ZakatAcademyQuiz::count())->toBe(0)->and(ZakatAcademyCourse::count())->toBe(0);
});

it('rolls back an exam and its container when question validation fails', function () {
    $this->postJson('/api/v1/academy/admin/exams', singleExamInput(['options' => json_encode([
        ['id' => '', 'label' => 'A', 'isCorrect' => false], ['id' => '', 'label' => 'B', 'isCorrect' => false],
    ])]))->assertUnprocessable();
    expect(\App\Modules\Academy\Models\ZakatAcademyQuiz::count())->toBe(0)->and(ZakatAcademyCourse::count())->toBe(0);
});

it('uses one activation switch and never enables global retakes', function () {
    $result = $this->postJson('/api/v1/academy/admin/exams', singleExamInput(['isActive' => true, 'allowRetake' => true]))->assertSuccessful()->json('data');
    $quiz = \App\Modules\Academy\Models\ZakatAcademyQuiz::findOrFail($result['id']);
    expect($quiz->isPublished)->toBeTrue()->and($quiz->isActive)->toBeTrue()->and($quiz->allowRetake)->toBeFalse();
    $options = $quiz->questions()->with('options')->first()->options->map(fn ($option) => ['id' => $option->id, 'label' => $option->label, 'isCorrect' => $option->isCorrect])->all();
    $this->postJson('/api/v1/academy/admin/exams/'.$quiz->id, singleExamInput(['isActive' => false, 'isPublished' => true, 'options' => json_encode($options)]))->assertSuccessful();
    expect($quiz->fresh()->isPublished)->toBeFalse()->and($quiz->fresh()->isActive)->toBeFalse();
});

it('lists every exam for grouping by cohort without pagination', function () {
    $cohort = \App\Modules\Academy\Models\AcademyCohort::firstOrFail();
    $chapter = app(\App\Modules\Academy\Services\CohortLearning::class)->container($cohort->id);
    foreach (range(1, 26) as $index) {
        $quiz = new \App\Modules\Academy\Models\ZakatAcademyQuiz;
        $quiz->forceFill(['chapterId' => $chapter->id, 'title' => 'Ujian '.$index, 'passingScore' => 70, 'timeLimitMinutes' => 5])->save();
    }
    $this->getJson('/api/v1/academy/admin/quizzes?all=1')->assertSuccessful()->assertJsonCount(26, 'data.items')->assertJsonPath('data.pages', 1)->assertJsonPath('data.items.0.chapter.course.cohort.id', $cohort->id);
});

it('lists all materials in the selected cohort in ascending order starting at one', function () {
    $cohort = \App\Modules\Academy\Models\AcademyCohort::firstOrFail();
    $chapter = app(\App\Modules\Academy\Services\CohortLearning::class)->container($cohort->id);
    foreach (array_reverse(range(1, 25)) as $order) {
        $lesson = new ZakatAcademyLesson;
        $lesson->forceFill(['chapterId' => $chapter->id, 'title' => 'Materi '.$order, 'slug' => 'urutan-'.$order, 'order' => $order, 'videoProvider' => 'AUDIO', 'videoUrl' => ''])->save();
    }
    $other = new \App\Modules\Academy\Models\AcademyCohort;
    $other->title = 'Angkatan lain';
    $other->save();
    $this->postJson('/api/v1/academy/admin/materials', ['cohortId' => $other->id, 'title' => 'Materi lain', 'order' => 1])->assertSuccessful();
    $response = $this->getJson('/api/v1/academy/admin/materials?all=1&cohort='.$cohort->id)->assertSuccessful()->assertJsonCount(25, 'data.items')->assertJsonPath('data.nextOrder', 26);
    expect(array_column($response->json('data.items'), 'order'))->toBe(range(1, 25));
});
