<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyLesson;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Models\ZakatAcademyQuiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = new User;
    $this->admin->forceFill(['name' => 'QA admin', 'email' => 'qa-admin@example.test', 'password_hash' => bcrypt('qa-password'), 'is_superadmin' => true, 'is_active' => true])->save();
    (new Module)->forceFill(['slug' => 'academy', 'name' => 'Academy', 'isActive' => true])->save();
    $this->cohort = new AcademyCohort;
    $this->cohort->title = 'QA Academy';
    $this->cohort->save();
    Sanctum::actingAs($this->admin);
    $id = $this->postJson('/api/v1/academy/admin/exams', [
        'cohortId' => $this->cohort->id, 'title' => 'QA exam', 'kind' => 'FINAL',
        'passingScore' => 70, 'timeLimitMinutes' => 5, 'isActive' => true, 'isPublished' => true,
        'question' => 'Choose the correct option', 'type' => 'SINGLE',
        'options' => json_encode([['id' => '', 'label' => 'Correct', 'isCorrect' => true], ['id' => '', 'label' => 'Incorrect', 'isCorrect' => false]]),
    ])->assertSuccessful()->json('data.id');
    $this->quiz = ZakatAcademyQuiz::with('questions.options')->findOrFail($id);
    $this->student = new User;
    $this->student->forceFill(['name' => 'QA student', 'email' => 'qa-student@example.test', 'password_hash' => bcrypt('qa-password'), 'is_active' => true])->save();
    $this->profile = new ZakatAcademyProfile;
    $this->profile->forceFill(['userId' => $this->student->id, 'nis' => 'PAZ-QA'])->save();
    app(CohortLearning::class)->join($this->profile, $this->cohort);
    Sanctum::actingAs($this->student);
});

it('denies participant access to administrative and teacher data', function (string $path) {
    $this->getJson('/api/v1/academy/'.$path)->assertForbidden();
})->with([
    'admin/materials', 'admin/intake', 'admin/cohorts', 'admin/enrollments',
    'admin/completions', 'admin/settings', 'admin/curriculum/stats', 'admin/courses',
    'admin/quizzes', 'teacher/stats', 'teacher/materials', 'teacher/quizzes',
    'teacher/questions', 'teacher/grades',
]);

it('loads participant learning pages without server errors', function (string $path) {
    $this->getJson('/api/v1/academy/'.$path)->assertSuccessful();
})->with([
    'learning/overview', 'learning/quizzes', 'learning/rankings', 'learning/cohorts',
    'learning/notes', 'learning/discussions', 'learning/certificates', 'notifications',
]);

it('keeps answers private scores a submission and prevents duplicate attempts', function () {
    $url = '/api/v1/academy/quizzes/'.$this->quiz->id;
    $id = $this->postJson($url.'/attempts')->assertCreated()->json('data');
    $this->postJson($url.'/attempts')->assertCreated()->assertJsonPath('data', $id);
    $this->getJson($url.'/attempts/'.$id)->assertSuccessful()
        ->assertJsonMissingPath('data.answers.questions.0.options.0.isCorrect')
        ->assertJsonMissingPath('data.answers.questions.0.explanation');
    $question = $this->quiz->questions->first();
    $answer = ['questionId' => $question->id, 'optionId' => $question->options->firstWhere('isCorrect', true)->id];
    $this->putJson('/api/v1/academy/attempts/'.$id, ['answer' => $answer])->assertSuccessful();
    $this->putJson('/api/v1/academy/attempts/'.$id, ['submit' => true])->assertSuccessful();
    $this->putJson('/api/v1/academy/attempts/'.$id, ['submit' => true])->assertSuccessful();
    expect(ZakatAcademyQuizAttempt::findOrFail($id)->score)->toBe(100.0);
    expect(ZakatAcademyQuizAttempt::count())->toBe(1);
    $this->postJson($url.'/attempts')->assertConflict();
    $this->getJson($url.'/attempts/'.$id)->assertJsonMissingPath('data.answers.questions.0.options.0.isCorrect');
});

it('rejects foreign options and ignores answers received after the deadline', function () {
    $id = $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->json('data');
    $question = $this->quiz->questions->first();
    $this->putJson('/api/v1/academy/attempts/'.$id, ['answer' => ['questionId' => $question->id, 'optionId' => 'foreign']])->assertUnprocessable();
    $this->travel(6)->minutes();
    $this->putJson('/api/v1/academy/attempts/'.$id, ['answer' => ['questionId' => $question->id, 'optionId' => $question->options->firstWhere('isCorrect', true)->id], 'submit' => true])->assertSuccessful();
    expect(ZakatAcademyQuizAttempt::findOrFail($id)->score)->toBe(0.0);
});

it('stores all local answers in one request when the participant submits', function () {
    $id = $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->json('data');
    $question = $this->quiz->questions->first();
    $option = $question->options->firstWhere('isCorrect', true)->id;

    $this->putJson('/api/v1/academy/attempts/'.$id, [
        'answers' => [$question->id => $option], 'submit' => true,
    ])->assertSuccessful()->assertJsonPath('data.completed', true);

    $attempt = ZakatAcademyQuizAttempt::findOrFail($id);
    expect($attempt->score)->toBe(100.0)
        ->and($attempt->answers['responses'][$question->id])->toBe($option);
});

it('rejects an invalid option in a batch submission', function () {
    $id = $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->json('data');
    $question = $this->quiz->questions->first();

    $this->putJson('/api/v1/academy/attempts/'.$id, [
        'answers' => [$question->id => 'foreign-option'], 'submit' => true,
    ])->assertUnprocessable();
    expect(ZakatAcademyQuizAttempt::findOrFail($id)->isCompleted)->toBeFalse();
});

it('stores private question images and exposes them only through authenticated academy access', function () {
    Storage::fake('local');
    $question = $this->quiz->questions->first();
    $options = $question->options->map(fn ($option) => [
        'id' => $option->id, 'label' => $option->label, 'isCorrect' => $option->isCorrect,
    ])->all();
    Sanctum::actingAs($this->admin);
    $this->post('/api/v1/academy/teacher/quizzes/'.$this->quiz->id.'/questions/'.$question->id, [
        'question' => $question->question, 'order' => $question->order, 'type' => $question->type,
        'weight' => $question->weight, 'explanation' => 'Penjelasan gambar', 'mediaAlt' => 'Diagram bantuan',
        'options' => json_encode($options), 'media' => UploadedFile::fake()->image('diagram.jpg', 640, 480),
    ])->assertSuccessful();

    $question->refresh();
    expect($question->mediaMime)->toBe('image/jpeg')->and($question->mediaAlt)->toBe('Diagram bantuan');
    Storage::disk('local')->assertExists($question->mediaPath);

    Sanctum::actingAs($this->student);
    $this->get('/api/v1/academy/questions/'.$question->id.'/media')->assertSuccessful()->assertHeader('Content-Type', 'image/jpeg');
    $attemptId = $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->assertCreated()->json('data');
    $snapshot = ZakatAcademyQuizAttempt::findOrFail($attemptId)->answers;
    expect($snapshot['questions'][0]['mediaMime'])->toBe('image/jpeg')
        ->and($snapshot['questions'][0])->not->toHaveKey('mediaPath');
});

it('hides attempts belonging to another participant', function () {
    $id = $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->json('data');
    $other = new User;
    $other->forceFill(['name' => 'Other', 'email' => 'qa-other@example.test', 'password_hash' => bcrypt('qa-password'), 'is_active' => true])->save();
    $profile = new ZakatAcademyProfile;
    $profile->forceFill(['userId' => $other->id, 'nis' => 'PAZ-QA-OTHER'])->save();
    app(CohortLearning::class)->join($profile, $this->cohort);
    Sanctum::actingAs($other);
    $this->getJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts/'.$id)->assertNotFound();
    $this->putJson('/api/v1/academy/attempts/'.$id, ['submit' => true])->assertNotFound();
});

it('blocks a closed or inactive exam', function (string $state) {
    $this->quiz->forceFill($state === 'closed' ? ['closesAt' => now()->subMinute()] : ['isActive' => false])->save();
    $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->assertForbidden();
})->with(['closed', 'inactive']);

it('keeps maintenance restrictions on participants while admins retain management access', function () {
    Sanctum::actingAs($this->admin);
    $this->putJson('/api/v1/academy/admin/settings/maintenance', ['maintenance' => true])->assertSuccessful();
    $this->getJson('/api/v1/academy/admin/settings')->assertSuccessful()->assertJsonPath('data.maintenance', true);
    Sanctum::actingAs($this->student);
    $this->getJson('/api/v1/academy/learning/overview')->assertForbidden();
    $this->postJson('/api/v1/academy/quizzes/'.$this->quiz->id.'/attempts')->assertForbidden();
});

it('rejects inactive accounts even when their session was previously valid', function () {
    $this->student->is_active = false;
    $this->student->save();
    Sanctum::actingAs($this->student->fresh());
    $this->getJson('/api/v1/academy/learning/overview')->assertUnauthorized();
});

it('persists private notes and progress and isolates both from another participant', function () {
    $lesson = new ZakatAcademyLesson;
    $lesson->forceFill(['chapterId' => $this->quiz->chapterId, 'title' => 'QA lesson', 'slug' => 'qa-lesson', 'videoProvider' => 'AUDIO', 'videoUrl' => '', 'order' => 1, 'releaseDay' => 1, 'isPublished' => true])->save();
    $this->putJson('/api/v1/academy/lessons/'.$lesson->id.'/note', ['content' => 'Private QA note'])->assertSuccessful();
    $this->putJson('/api/v1/academy/lessons/'.$lesson->id.'/progress', ['completed' => true])->assertSuccessful();
    $this->getJson('/api/v1/academy/learning/notes')->assertSuccessful()->assertSee('Private QA note');
    $this->getJson('/api/v1/academy/learning/overview')->assertJsonPath('data.0.completedLessons', 1);
    $other = new User;
    $other->forceFill(['name' => 'Other learner', 'email' => 'qa-private@example.test', 'password_hash' => bcrypt('qa-password'), 'is_active' => true])->save();
    $profile = new ZakatAcademyProfile;
    $profile->forceFill(['userId' => $other->id, 'nis' => 'PAZ-QA-PRIVATE'])->save();
    app(CohortLearning::class)->join($profile, $this->cohort);
    Sanctum::actingAs($other);
    $this->getJson('/api/v1/academy/learning/notes')->assertSuccessful()->assertDontSee('Private QA note');
    $this->getJson('/api/v1/academy/learning/overview')->assertJsonPath('data.0.completedLessons', 0);
});

it('requires the current password and revokes all sessions after a password change', function () {
    $this->student->tokens()->create(['name' => 'qa-session', 'token' => hash('sha256', 'qa-session'), 'abilities' => ['*']]);
    $this->putJson('/api/v1/academy/profile/password', ['currentPassword' => 'incorrect', 'password' => 'new-qa-password', 'confirmPassword' => 'new-qa-password'])->assertUnprocessable();
    $this->putJson('/api/v1/academy/profile/password', ['currentPassword' => 'qa-password', 'password' => 'new-qa-password', 'confirmPassword' => 'new-qa-password'])->assertSuccessful();
    expect(Hash::check('new-qa-password', $this->student->fresh()->password_hash))->toBeTrue();
    expect($this->student->tokens()->count())->toBe(0);
});

it('returns only the authenticated participants profile even when another user is requested', function () {
    $this->profile->forceFill(['phone' => '628123456789', 'address' => 'Alamat sendiri', 'gender' => 'IKHWAN', 'mustChangePassword' => true])->save();
    $other = new User;
    $other->forceFill(['name' => 'PRIVATE_OTHER', 'email' => 'private-other@example.test', 'password_hash' => bcrypt('other-password'), 'is_active' => true])->save();
    $otherProfile = new ZakatAcademyProfile;
    $otherProfile->forceFill(['userId' => $other->id, 'nis' => 'PAZ-OTHER', 'phone' => '628998887776', 'address' => 'PRIVATE_ADDRESS'])->save();
    $response = $this->getJson('/api/v1/academy/profile?userId='.$other->id.'&profileId='.$otherProfile->id)->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.name', $this->student->name)->assertJsonPath('data.nis', 'PAZ-QA')
        ->assertJsonPath('data.phone', '628123456789')->assertJsonPath('data.address', 'Alamat sendiri');
    expect(array_keys($response->json('data')))->toBe(['name', 'code', 'email', 'nis', 'phone', 'address', 'gender'])
        ->and($response->getContent())->not->toContain('PRIVATE_OTHER', 'PRIVATE_ADDRESS', 'private-other@example.test', 'password_hash');
});

it('requires authentication to read participant profile data', function () {
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/v1/academy/profile')->assertUnauthorized();
});
