<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\AcademyCohort as Cohort;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyTimetable;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodayController
{
    public function index(Request $request, AcademyContext $context, AcademyTimetable $timetable)
    {
        $profile = $context->profile($request);
        $now = CarbonImmutable::now('UTC');
        $changes = [];
        $materials = [];
        // The current cohort is chosen by Core/profile, never by an arbitrary query selector.
        $cohorts = Cohort::whereHas('participants', fn ($query) => $query->where('zakat_academy_profiles.id', $profile->id))
            ->when($profile->cohortId, fn ($query) => $query->where('id', $profile->cohortId))->get();
        foreach ($cohorts as $cohort) {
            // Material windows are set independently by the administrator.
            $lessons = Lesson::whereHas('chapter.course', fn ($query) => $query->where('cohort_id', $cohort->id)->whereHas('enrollments', fn ($enroll) => $enroll->where('profile_id', $profile->id)))
                ->join('zakat_academy_chapters as schedule_chapter', 'schedule_chapter.id', '=', 'zakat_academy_lessons.chapter_id')
                ->select('zakat_academy_lessons.*')->with('chapter.course')->orderBy('schedule_chapter.order')->orderBy('schedule_chapter.id')->orderBy('zakat_academy_lessons.order')->orderBy('zakat_academy_lessons.id')->get();
            foreach ($lessons as $index => $lesson) {
                $opens = $lesson->dashboardOpensAt;
                $closes = $lesson->dashboardClosesAt;
                if (! $opens || ! $closes || $closes <= $opens) {
                    continue;
                }
                if (! $lesson->isPublished || ! $lesson->chapter->isPublished || ! $lesson->chapter->course->isPublished) {
                    continue;
                }
                foreach ([$opens, $closes] as $boundary) {
                    if ($boundary > $now) {
                        $changes[] = $boundary;
                    }
                }
                if ($opens <= $now && $now < $closes && $context->released($lesson->chapter->course->startsAt, $lesson->releaseDay)) {
                    $materials[] = ['id' => $lesson->id, 'title' => $lesson->title, 'number' => $index + 1, 'opensAt' => $opens->toISOString(), 'closesAt' => $closes->toISOString()];
                }
            }
        }
        $quizzes = Quiz::where('is_published', true)->where('is_active', true)->whereNotNull('closes_at')
            ->whereHas('chapter', fn ($query) => $query->where('is_published', true)->whereHas('course', fn ($course) => $course->where('is_published', true)
                ->when($profile->cohortId, fn ($scope) => $scope->where('cohort_id', $profile->cohortId))
                ->whereHas('enrollments', fn ($enroll) => $enroll->where('profile_id', $profile->id))))->with('chapter.course')->get();
        $exams = [];
        foreach ($quizzes as $quiz) {
            $opens = $timetable->examOpening($quiz);
            $closes = $quiz->closesAt;
            if (! $opens || $closes <= $opens) {
                continue;
            }
            foreach ([$opens, $closes] as $boundary) {
                if ($boundary > $now) {
                    $changes[] = $boundary;
                }
            }
            if ($opens <= $now && $now < $closes) {
                $exams[] = ['id' => $quiz->id, 'title' => $quiz->title, 'kind' => $quiz->kind, 'opensAt' => $opens->toISOString(), 'closesAt' => $closes->toISOString(),
                    'completed' => Attempt::where('profile_id', $profile->id)->where('quiz_id', $quiz->id)->where('is_completed', true)->exists()];
            }
        }
        $latest = fn ($left, $right) => strcmp($right['opensAt'], $left['opensAt']) ?: strcmp($left['id'], $right['id']);
        usort($materials, $latest);
        usort($exams, $latest);
        usort($changes, fn ($left, $right) => $left <=> $right);

        return (new JsonResource(['serverNow' => $now->toISOString(), 'nextChangeAt' => ($changes[0] ?? null)?->toISOString(),
            'material' => $materials[0] ?? null, 'exam' => $exams[0] ?? null]))->response()->header('Cache-Control', 'no-store, private');
    }
}
