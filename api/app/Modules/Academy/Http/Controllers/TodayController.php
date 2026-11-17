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
use Illuminate\Support\Facades\DB;

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
            ->when($profile->cohortId, fn ($query) => $query->where('id', $profile->cohortId))->whereNotNull('dashboard_starts_on')->get();
        foreach ($cohorts as $cohort) {
            // Keep draft positions reserved so unpublishing material 1 cannot promote material 2 into its time slot.
            $lessons = Lesson::whereHas('chapter.course', fn ($query) => $query->where('cohort_id', $cohort->id)->whereHas('enrollments', fn ($enroll) => $enroll->where('profile_id', $profile->id)))
                ->join('zakat_academy_chapters as schedule_chapter', 'schedule_chapter.id', '=', 'zakat_academy_lessons.chapter_id')
                ->select('zakat_academy_lessons.*')->with('chapter.course')->orderBy('schedule_chapter.order')->orderBy('schedule_chapter.id')->orderBy('zakat_academy_lessons.order')->orderBy('zakat_academy_lessons.id')->take(12)->get();
            foreach ($lessons as $index => $lesson) {
                [$opens, $closes] = $timetable->materialWindow($cohort->dashboardStartsOn->format('Y-m-d'), $index + 1);
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

    public function schedule(Request $request, string $id, AcademyContext $context, AcademyTimetable $timetable)
    {
        $context->admin($request);
        abort_if(array_diff(array_keys($request->all()), ['startsOn']), 422, 'Field jadwal tidak valid.');
        $data = $request->validate(['startsOn' => 'present|nullable|date_format:Y-m-d']);
        $date = $data['startsOn'] ? CarbonImmutable::parse($data['startsOn'], 'Asia/Jakarta') : null;
        abort_if($date && ! $date->isSunday(), 422, 'Pilih tanggal Ahad pertama angkatan.');
        DB::transaction(function () use ($id, $date, $timetable) {
            $cohort = Cohort::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($cohort->dashboardStartsOn?->format('Y-m-d') === $date?->format('Y-m-d')) {
                return;
            }
            abort_if(Attempt::whereHas('quiz.chapter.course', fn ($query) => $query->where('cohort_id', $id))->exists(), 409, 'Jadwal angkatan tidak dapat digeser setelah peserta mulai ujian.');
            $cohort->dashboardStartsOn = $date;
            $cohort->save();
            $timetable->syncExams($id);
        });

        return (new JsonResource(['startsOn' => $date?->format('Y-m-d')]))->response()->header('Cache-Control', 'no-store, private');
    }
}
