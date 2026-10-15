<?php

use App\Modules\Academy\Http\Controllers\CourseController;
use App\Modules\Academy\Http\Controllers\CurriculumController;
use App\Modules\Academy\Http\Controllers\FileController;
use App\Modules\Academy\Http\Controllers\IntakeController;
use App\Modules\Academy\Http\Controllers\LearningController;
use App\Modules\Academy\Http\Controllers\PageDataController;
use App\Modules\Academy\Http\Controllers\QuizController;
use App\Modules\Academy\Http\Controllers\TeacherController;
use App\Modules\Core\Http\Controllers\ParticipantController;
use Illuminate\Support\Facades\Route;

Route::middleware('module.public:academy')->group(function () {
    Route::get('settings/learning', [CourseController::class, 'settings']);
    Route::get('intake', [CourseController::class, 'intake']);
    Route::get('courses', [CourseController::class, 'index']);
    Route::get('courses/by-slug/{slug}', [CourseController::class, 'show']);
    Route::get('leaderboard', [CourseController::class, 'leaderboard']);
    Route::post('register', [ParticipantController::class, 'registerAcademy'])->middleware('throttle:login');
});
Route::middleware(['auth:sanctum', 'user.active'])->group(function () {
    $pages = PageDataController::class;
    $intake = IntakeController::class;
    Route::get('contacts', [$intake, 'contacts']);
    Route::get('notifications', [$pages, 'notifications']);
    Route::get('learning/notes', [$pages, 'notes']);
    Route::get('learning/discussions', [$pages, 'discussions']);
    Route::get('learning/certificates', [$pages, 'certificates']);
    Route::get('learning/material/{courseId}', [$pages, 'material']);
    Route::get('learning/lessons/{courseSlug}/{lessonSlug}', [$pages, 'lesson']);
    Route::get('admin/intake', [$pages, 'intake']);
    Route::get('admin/people/{id}', [$pages, 'person']);
    Route::get('admin/cohorts', [$pages, 'cohorts']);
    Route::post('admin/cohorts', [$intake, 'cohort']);
    Route::post('admin/courses/{courseId}/import', [$intake, 'import']);
    Route::put('admin/courses/{courseId}/registration', [$intake, 'registration']);
    Route::put('admin/courses/{courseId}/schedule', [$intake, 'schedule']);
    Route::put('admin/enrollments/{id}/group', [$intake, 'group']);
    Route::put('admin/settings/learning', [$intake, 'settings']);
    Route::get('teacher/stats', [$pages, 'teacherStats']);
    Route::get('teacher/materials', [$pages, 'teacherMaterials']);
    Route::get('teacher/quizzes', [$pages, 'teacherQuizzes']);
    Route::get('teacher/quizzes/{id}', [$pages, 'teacherQuiz']);
    Route::get('teacher/questions', [$pages, 'teacherQuestions']);
    Route::get('teacher/grades', [$pages, 'teacherGrades']);
    Route::get('teacher/support', [$pages, 'support']);
    $teacher = TeacherController::class;
    Route::post('teacher/materials/{id?}', [$teacher, 'material']);
    Route::post('teacher/quizzes/{id?}', [$teacher, 'quiz']);
    Route::post('teacher/quizzes/{quizId}/questions/{id?}', [$teacher, 'question']);
    Route::post('upload', [FileController::class, 'upload']);
    Route::post('audio-progress', [FileController::class, 'audioProgress']);
    Route::get('files/{fileId}', [FileController::class, 'show']);
    Route::get('enrollments/course/{courseId}', [CourseController::class, 'enrollment']);
    Route::get('learning/overview', [CourseController::class, 'overview']);
    Route::get('learning/quizzes', [CourseController::class, 'quizzes']);
    Route::get('learning/rankings', [CourseController::class, 'rankings']);
    Route::post('courses/{courseId}/enroll', [LearningController::class, 'enroll']);
    Route::put('lessons/{lessonId}/progress', [LearningController::class, 'mark']);
    Route::put('lessons/{lessonId}/note', [LearningController::class, 'note']);
    Route::put('profile/password', [LearningController::class, 'password']);
    Route::post('courses/{courseId}/questions', [LearningController::class, 'ask']);
    Route::put('discussions/{id}/answer', [LearningController::class, 'answer']);
    Route::put('lessons/{id}/audio', [LearningController::class, 'audio']);
    Route::post('courses/{courseId}/sessions', [LearningController::class, 'session']);
    Route::post('notifications/read', [LearningController::class, 'reminder']);
    Route::post('quizzes/{quizId}/attempts', [QuizController::class, 'start']);
    Route::put('attempts/{id}', [QuizController::class, 'update']);
    Route::get('quizzes/{quizId}/attempts/{id}', [QuizController::class, 'show']);
    Route::prefix('admin')->group(function () {
        $participants = App\Modules\Academy\Http\Controllers\ParticipantController::class;
        Route::get('enrollments', [$participants, 'enrollments']);
        Route::get('enrollments/{id}', [$participants, 'enrollmentDetail']);
        Route::post('enrollments/{id}/completion', [$participants, 'sync']);
        Route::get('completions', [$participants, 'completions']);
        Route::get('completions/{id}', [$participants, 'completion']);
        Route::put('completions/{id}/certificate', [$participants, 'certificate']);
        Route::delete('completions/{id}', [$participants, 'destroy']);
        Route::get('settings', [$participants, 'settings']);
        Route::put('settings/maintenance', [$participants, 'maintenance']);
        Route::get('curriculum/stats', [CurriculumController::class, 'stats']);
        Route::get('courses', [CurriculumController::class, 'index']);
        Route::get('quizzes', [CurriculumController::class, 'quizzes']);
        Route::get('courses/{courseId}', [CurriculumController::class, 'show']);
        Route::get('courses/{courseId}/chapters/{chapterId}', [CurriculumController::class, 'showChapter']);
        Route::get('courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}', [CurriculumController::class, 'showLesson']);
        Route::get('courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}', [CurriculumController::class, 'showQuiz']);
        foreach (['courses' => 'saveCourse', 'courses/{courseId}/chapters' => 'saveChapter', 'courses/{courseId}/chapters/{chapterId}/lessons' => 'saveLesson', 'courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}/attachments' => 'saveAttachment', 'courses/{courseId}/chapters/{chapterId}/quizzes' => 'saveQuiz', 'courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions' => 'saveQuestion'] as $path => $method) {
            Route::post($path, [CurriculumController::class, $method]);
            $param = match ($method) {
                'saveCourse' => 'courseId', 'saveChapter' => 'chapterId', 'saveLesson' => 'lessonId', 'saveQuiz' => 'quizId', default => 'id'
            };
            Route::put($path.'/{'.$param.'}', [CurriculumController::class, $method]);
        }
        Route::put('courses/{courseId}/chapters/{chapterId}/order', [CurriculumController::class, 'order']);
        Route::put('courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}/order', [CurriculumController::class, 'order']);
        Route::delete('courses/{courseId}', [CurriculumController::class, 'destroy']);
        Route::delete('courses/{courseId}/chapters/{chapterId}', [CurriculumController::class, 'destroy']);
        Route::delete('courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}', [CurriculumController::class, 'destroy']);
        Route::delete('courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}/attachments/{id}', [CurriculumController::class, 'destroyAttachment']);
        Route::delete('courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}', [CurriculumController::class, 'destroyQuiz']);
        Route::delete('courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{id}', [CurriculumController::class, 'destroyQuestion']);
    });
});
