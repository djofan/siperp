<?php

use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\GradePredicate;

it('assigns predicates at every boundary including decimal scores', function (float $score, string $predicate) {
    expect(GradePredicate::forScore($score))->toBe($predicate);
})->with([
    [0, 'Maqbul'], [50, 'Maqbul'], [50.01, 'Jayyid'], [51, 'Jayyid'],
    [70, 'Jayyid'], [70.01, 'Jayyid Jiddan'], [71, 'Jayyid Jiddan'],
    [90, 'Jayyid Jiddan'], [90.01, 'Mumtaz'], [91, 'Mumtaz'],
    [99, 'Mumtaz'], [99.99, 'Mumtaz'], [100, 'Mumtaz Murtafi'],
]);

it('derives the predicate from the weighted recap rather than the quiz average', function () {
    $context = new class extends AcademyContext {
        public function settings(): array
        {
            return ['weights' => ['DAILY' => 20, 'WEEKLY' => 30, 'FINAL' => 50]];
        }
    };
    $quizzes = [['id' => 'd', 'kind' => 'DAILY'], ['id' => 'w', 'kind' => 'WEEKLY'], ['id' => 'f', 'kind' => 'FINAL']];
    $attempts = [['quizId' => 'd', 'score' => 100], ['quizId' => 'w', 'score' => 100], ['quizId' => 'f', 'score' => 0]];
    $grade = $context->weighted($quizzes, $attempts);
    expect($grade['score'])->toEqual(50)->and($grade['predicate'])->toBe('Maqbul')->and($grade['complete'])->toBeTrue();
    $grade = $context->weighted($quizzes, array_slice($attempts, 0, 1));
    expect($grade['score'])->toEqual(20)->and($grade['predicate'])->toBe('Maqbul')->and($grade['complete'])->toBeFalse();
});
