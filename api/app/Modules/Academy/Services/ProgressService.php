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
        $quizzes = Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('course_id', $courseId)->where('is_published', true))->select('id', 'kind', 'closes_at')->get();
        $progress = Progress::where('profile_id', $profileId)->where('completed', true)->whereIn('lesson_id', $lessons->pluck('id'))->get();
        // Select aggregate fields only; attempt snapshots contain answer keys.
        $attempts = Attempt::where('profile_id', $profileId)->where('is_completed', true)->whereIn('quiz_id', $quizzes->pluck('id'))->select('quiz_id', 'score', 'passed', 'submitted_at')->get();
        $passed = $attempts->where('passed', true)->groupBy('quizId');
        $finished = $attempts->filter(fn ($attempt) => $attempt->score !== null)->groupBy('quizId');
        $grading = $this->context->weighted($quizzes->toArray(), $attempts->toArray());
        $certificateVisible = $quizzes->contains('kind', 'FINAL') && $quizzes->every(fn ($quiz) => $quiz->closesAt !== null && ! $quiz->closesAt->isFuture());
        $periodEndedAt = $certificateVisible ? $quizzes->pluck('closesAt')->max() : null;

        return ['totalLessons' => $lessons->count(), 'completedLessons' => $progress->count(), 'totalQuizzes' => $quizzes->count(), 'passedQuizzes' => $passed->count(), 'completedQuizzes' => $finished->count(), 'percent' => $lessons->count() ? (int) round($progress->count() / $lessons->count() * 100) : 0, 'certificateVisible' => $enrollment->course->isPublished && $certificateVisible, 'isEligible' => $enrollment->course->isPublished && $certificateVisible, 'grading' => $grading, 'completedAt' => $periodEndedAt?->toISOString()];
    }
}
