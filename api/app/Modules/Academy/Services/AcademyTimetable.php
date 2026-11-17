<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use Carbon\CarbonImmutable;

class AcademyTimetable
{
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
