<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyLessonProgress as Progress;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;

class ProgressService
{
    public function __construct(private AcademyContext $context) {}

    public function forEnrollment($enrollment): array
    {
        $profileId = $enrollment->profileId;
        $courseId = $enrollment->courseId;
        $lessons = Lesson::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('course_id', $courseId)->where('is_published', true))->select('id')->get();
        $quizzes = Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('course_id', $courseId)->where('is_published', true))->select('id', 'kind')->get();
        $progress = Progress::where('profile_id', $profileId)->where('completed', true)->whereIn('lesson_id', $lessons->pluck('id'))->get();
        // Select aggregate fields only; attempt snapshots contain answer keys.
        $attempts = Attempt::where('profile_id', $profileId)->where('is_completed', true)->whereIn('quiz_id', $quizzes->pluck('id'))->select('quiz_id', 'score', 'passed', 'submitted_at')->get();
        $passed = $attempts->where('passed', true)->groupBy('quizId');
        $dates = $progress->pluck('completedAt')->filter()->all();
        foreach ($passed as $values) {
            $date = $values->pluck('submittedAt')->filter()->sort()->first();
            if ($date) {
                $dates[] = $date;
            }
        }
        $grading = $this->context->weighted($quizzes->toArray(), $attempts->toArray());
        $complete = $lessons->count() > 0 && $lessons->count() === $progress->count() && $quizzes->count() === $passed->count();

        return ['totalLessons' => $lessons->count(), 'completedLessons' => $progress->count(), 'totalQuizzes' => $quizzes->count(), 'passedQuizzes' => $passed->count(), 'percent' => $lessons->count() ? (int) round($progress->count() / $lessons->count() * 100) : 0, 'isEligible' => $enrollment->course->isPublished && $complete && $grading['complete'] && $grading['score'] >= 70, 'grading' => $grading, 'completedAt' => count($dates) ? max($dates)->toISOString() : null];
    }
}
