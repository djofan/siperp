<?php

use App\Modules\Academy\Services\RankingTiming;

it('sums duration for the best scores and charges full time for skipped or unfinished exams', function () {
    $quizzes = [['id' => 'daily', 'timeLimitMinutes' => 5], ['id' => 'final', 'timeLimitMinutes' => 10]];
    $attempts = [
        ['quizId' => 'daily', 'score' => 100, 'startedAt' => '2026-11-01T00:00:00Z', 'submittedAt' => '2026-11-01T00:02:00Z'],
        ['quizId' => 'daily', 'score' => 50, 'startedAt' => '2026-11-01T00:00:00Z', 'submittedAt' => '2026-11-01T00:00:01Z'],
        ['quizId' => 'final', 'score' => null, 'startedAt' => '2026-11-01T00:00:00Z', 'submittedAt' => null],
    ];
    expect(RankingTiming::totalMilliseconds($quizzes, $attempts))->toBe(720000);
    $attempts[] = ['quizId' => 'daily', 'score' => 100, 'startedAt' => '2026-11-01T00:00:00Z', 'submittedAt' => '2026-11-01T00:01:00Z'];
    expect(RankingTiming::totalMilliseconds($quizzes, $attempts))->toBe(660000);
    expect(RankingTiming::totalMilliseconds($quizzes, []))->toBe(900000);
});

it('does not assign negative or missing timestamps an advantage', function () {
    $quizzes = [['id' => 'exam', 'timeLimitMinutes' => 5]];
    expect(RankingTiming::totalMilliseconds($quizzes, [['quizId' => 'exam', 'score' => 100, 'startedAt' => '2026-11-01T00:05:00Z', 'submittedAt' => '2026-11-01T00:00:00Z']]))->toBe(300000);
    expect(RankingTiming::totalMilliseconds($quizzes, [['quizId' => 'exam', 'score' => 0, 'startedAt' => null, 'submittedAt' => null]]))->toBe(300000);
});


it('orders by descending score then duration finish time name and stable identity without tied ranks', function () {
    $base = ['score' => 80, 'durationMs' => 60000, 'finishedAt' => '2026-11-01T10:00:00Z', 'name' => 'Budi', 'profileId' => 'b'];
    $rows = [
        array_replace($base, ['profileId' => 'q', 'name' => 'budi']),
        array_replace($base, ['profileId' => 'slow', 'durationMs' => 120000]),
        array_replace($base, ['profileId' => 'early', 'name' => 'Zaki', 'finishedAt' => '2026-11-01T09:00:00Z']),
        array_replace($base, ['profileId' => 'lower', 'score' => 79, 'durationMs' => 1000]),
        $base,
        array_replace($base, ['profileId' => 'a', 'name' => 'Amin']),
        array_replace($base, ['profileId' => 'higher', 'score' => 81, 'durationMs' => 180000]),
        array_replace($base, ['profileId' => 'missing', 'finishedAt' => null]),
    ];
    usort($rows, [RankingTiming::class, 'compare']);
    expect(array_column($rows, 'profileId'))->toBe(['higher', 'early', 'a', 'b', 'q', 'missing', 'slow', 'lower']);
});

it('uses the earliest finish among equally fast best scoring attempts', function () {
    $quizzes = [['id' => 'exam', 'timeLimitMinutes' => 5]];
    $attempts = [
        ['quizId' => 'exam', 'score' => 100, 'startedAt' => '2026-11-01T10:00:00Z', 'submittedAt' => '2026-11-01T10:01:00Z'],
        ['quizId' => 'exam', 'score' => 100, 'startedAt' => '2026-11-01T09:00:00Z', 'submittedAt' => '2026-11-01T09:01:00Z'],
    ];
    expect(RankingTiming::summary($quizzes, $attempts))->toBe(['durationMs' => 60000, 'finishedAt' => '2026-11-01T09:01:00.000000Z']);
});
