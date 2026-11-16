<?php

namespace App\Modules\Academy\Services;

use Carbon\CarbonImmutable;

class RankingTiming
{
    public static function totalMilliseconds(array $quizzes, array $attempts): int
    {
        return self::summary($quizzes, $attempts)['durationMs'];
    }

    public static function summary(array $quizzes, array $attempts): array
    {
        $total = 0;
        $finished = [];
        $allFinished = count($quizzes) > 0;
        foreach ($quizzes as $quiz) {
            $fallback = max(0, (int) $quiz['timeLimitMinutes']) * 60000;
            $bestScore = null;
            $bestTime = $fallback;
            $bestEnd = null;
            foreach ($attempts as $attempt) {
                if ($attempt['quizId'] !== $quiz['id'] || $attempt['score'] === null) {
                    continue;
                }
                $duration = $fallback;
                $end = null;
                if (! empty($attempt['startedAt']) && ! empty($attempt['submittedAt'])) {
                    $start = CarbonImmutable::parse($attempt['startedAt'])->getTimestampMs();
                    $submitted = CarbonImmutable::parse($attempt['submittedAt'])->getTimestampMs();
                    if ($submitted >= $start) {
                        $duration = $submitted - $start;
                        $end = $submitted;
                    }
                }
                $score = (float) $attempt['score'];
                if ($bestScore === null || $score > $bestScore || ($score === $bestScore && ($duration < $bestTime || ($duration === $bestTime && ($end ?? PHP_INT_MAX) < ($bestEnd ?? PHP_INT_MAX))))) {
                    $bestScore = $score;
                    $bestTime = $duration;
                    $bestEnd = $end;
                }
            }
            $total += $bestTime;
            if ($bestEnd === null) {
                $allFinished = false;
            } else {
                $finished[] = $bestEnd;
            }
        }

        return ['durationMs' => $total, 'finishedAt' => $allFinished ? CarbonImmutable::createFromTimestampMs(max($finished))->toISOString() : null];
    }

    public static function compare(array $left, array $right): int
    {
        return ($right['score'] <=> $left['score'])
            ?: ($left['durationMs'] <=> $right['durationMs'])
            ?: (($left['finishedAt'] === null ? PHP_INT_MAX : CarbonImmutable::parse($left['finishedAt'])->getTimestampMs()) <=> ($right['finishedAt'] === null ? PHP_INT_MAX : CarbonImmutable::parse($right['finishedAt'])->getTimestampMs()))
            ?: strcmp(mb_strtolower(trim($left['name'])), mb_strtolower(trim($right['name'])))
            ?: strcmp($left['profileId'], $right['profileId']);
    }
}
