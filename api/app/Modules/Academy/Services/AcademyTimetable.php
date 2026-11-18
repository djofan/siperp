<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use Carbon\CarbonImmutable;

class AcademyTimetable
{
    public function examOpening(Quiz $quiz): ?CarbonImmutable
    {
        // Explicit admin dates override the legacy cohort release-day schedule.
        if ($quiz->quizDate) {
            return $quiz->quizDate;
        }

        $start = $quiz->chapter->course->startsAt;
        if (! $start) {
            return null;
        }
        $release = $start->setTimezone('Asia/Jakarta')->startOfDay()->addDays($quiz->releaseDay - 1)->utc();

        return max($start, $release, $quiz->quizDate ?? $release);
    }
}
