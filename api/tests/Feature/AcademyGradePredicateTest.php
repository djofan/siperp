<?php

use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\GradePredicate;

it('assigns predicates at every boundary including decimal scores', function (float $score, string $predicate) {
    expect(GradePredicate::forScore($score))->toBe($predicate);
})->with([
    [0, 'Maqbul'], [50, 'Maqbul'], [50.01, 'Jayyid'], [51, 'Jayyid'],
    [70, 'Jayyid'], [70.01, 'Jayyid Jiddan'], [71, 'Jayyid Jiddan'],
    [85, 'Jayyid Jiddan'], [85.01, 'Mumtaz'], [86, 'Mumtaz'],
    [90, 'Mumtaz'], [95, 'Mumtaz'], [95.01, 'Mumtaz Murtafi'], [96, 'Mumtaz Murtafi'],
    [99, 'Mumtaz Murtafi'], [99.99, 'Mumtaz Murtafi'], [100, 'Mumtaz Murtafi'],
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


it('marks final results only after the final exams have scored attempts including zero', function () {
    $context = new class extends AcademyContext {
        public function settings(): array
        {
            return ['weights' => ['DAILY' => 35, 'WEEKLY' => 30, 'FINAL' => 35]];
        }
    };
    $quizzes = [['id' => 'daily', 'kind' => 'DAILY'], ['id' => 'final', 'kind' => 'FINAL']];
    expect($context->weighted($quizzes, [])['finalCompleted'])->toBeFalse();
    expect($context->weighted($quizzes, [['quizId' => 'daily', 'score' => 100]])['finalCompleted'])->toBeFalse();
    expect($context->weighted($quizzes, [['quizId' => 'final', 'score' => null]])['finalCompleted'])->toBeFalse();
    $grade = $context->weighted($quizzes, [['quizId' => 'final', 'score' => 0]]);
    expect($grade['finalCompleted'])->toBeTrue()->and($grade['complete'])->toBeFalse();
    expect($context->weighted([['id' => 'daily', 'kind' => 'DAILY']], [['quizId' => 'daily', 'score' => 100]])['finalCompleted'])->toBeFalse();
    $quizzes[] = ['id' => 'final2', 'kind' => 'FINAL'];
    expect($context->weighted($quizzes, [['quizId' => 'final', 'score' => 100]])['finalCompleted'])->toBeFalse();
});
