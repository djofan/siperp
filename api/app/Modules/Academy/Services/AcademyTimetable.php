<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use Carbon\CarbonImmutable;

class AcademyTimetable
{
    public function materialWindow(string $sunday, int $number): array
    {
        $start = CarbonImmutable::parse($sunday, 'Asia/Jakarta')->startOfDay()->setTime(17, 0)
            ->addDays(intdiv($number - 1, 4) * 7 + ($number - 1) % 4);

        return [$start->utc(), $start->addDay()->utc()];
    }

    public function syncExams(string $cohortId): void
    {
        // Called inside the manager's write transaction. Never schedule from a GET.
        $cohort = AcademyCohort::whereKey($cohortId)->lockForUpdate()->firstOrFail();
        if (! $cohort->dashboardStartsOn) {
            return;
        }
        $quizzes = Quiz::whereHas('chapter.course', fn ($query) => $query->where('cohort_id', $cohortId))
            ->whereIn('kind', ['DAILY', 'FINAL'])->orderBy('created_at')->orderBy('id')->lockForUpdate()->get();
        $daily = $quizzes->where('kind', 'DAILY')->values();
        abort_if($daily->count() > 12 || $quizzes->where('kind', 'FINAL')->count() > 1, 422, 'Jadwal otomatis mendukung maksimal 12 ujian harian dan satu ujian akhir per angkatan.');
        foreach ($quizzes as $quiz) {
            if ($quiz->kind === 'DAILY') {
                $number = $daily->search(fn ($item) => $item->id === $quiz->id) + 1;
                [$start, $end] = $this->materialWindow($cohort->dashboardStartsOn->format('Y-m-d'), $number);
                $start = $start->addDay();
                $end = $end->addDay();
            } else {
                $start = $cohort->dashboardStartsOn->setTimezone('Asia/Jakarta')->startOfDay()->addDays(26)->setTime(17, 0)->utc();
                $end = $start->addDays(2);
            }
            $releaseDay = $quiz->kind === 'DAILY' ? $number : 1;
            if ($quiz->quizDate?->equalTo($start) && $quiz->closesAt?->equalTo($end) && $quiz->releaseDay === $releaseDay) {
                continue;
            }
            abort_if(Attempt::where('quiz_id', $quiz->id)->exists(), 409, 'Jadwal ujian yang sudah dikerjakan tidak dapat digeser.');
            $quiz->quizDate = $start;
            $quiz->closesAt = $end;
            $quiz->releaseDay = $releaseDay;
            $quiz->save();
        }
    }

    public function examOpening(Quiz $quiz): ?CarbonImmutable
    {
        $start = $quiz->chapter->course->startsAt;
        if (! $start) {
            return null;
        }
        $release = $start->setTimezone('Asia/Jakarta')->startOfDay()->addDays($quiz->releaseDay - 1)->utc();

        return max($start, $release, $quiz->quizDate ?? $release);
    }
}
