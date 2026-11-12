<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyQuiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt;
use App\Modules\Academy\Services\AcademyContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizController
{
    public function __construct(private AcademyContext $context) {}

    private function deadline($attempt): CarbonImmutable
    {
        $snapshot = $attempt->answers;
        $deadline = $attempt->startedAt->addMinutes($snapshot['timeLimitMinutes']);

        return empty($snapshot['closesAt']) ? $deadline : min($deadline, CarbonImmutable::parse($snapshot['closesAt']));
    }

    private function finish($attempt, array $snapshot, $submittedAt, string $kind): void
    {
        $halfCredit = in_array($snapshot['kind'] ?? $kind, ['DAILY', 'WEEKLY'], true);
        $earned = 0;
        $possible = 0;
        foreach ($snapshot['questions'] as $question) {
            $weight = $question['weight'] ?? 1;
            $possible += $weight;
            $correct = array_column(array_filter($question['options'], fn ($o) => $o['isCorrect']), 'id');
            $selected = $snapshot['responses'][$question['id']] ?? [];
            if (! is_array($selected)) {
                $selected = [$selected];
            }
            if (count($correct) && count($selected) === count($correct) && count(array_unique($selected)) === count($selected) && ! array_diff($selected, $correct)) {
                $earned += $weight;
            } elseif ($halfCredit && count($selected) > 0 && count(array_unique($selected)) === count($selected) && ! array_diff($selected, array_column($question['options'], 'id'))) {
                $earned += $weight / 2;
            }
        }
        $score = $possible ? round($earned / $possible * 100, 2) : 0;
        $attempt->score = $score;
        $attempt->passed = count($snapshot['questions']) && $score >= $snapshot['passingScore'];
        $attempt->isCompleted = true;
        $attempt->submittedAt = $submittedAt;
    }

    private function storeAnswer(array &$snapshot, string $questionId, mixed $optionId): void
    {
        $question = collect($snapshot['questions'])->firstWhere('id', $questionId);
        $selected = is_array($optionId) ? $optionId : [$optionId];
        abort_if(! $question || array_filter($selected, fn ($value) => ! is_string($value))
            || count(array_unique($selected)) !== count($selected)
            || array_diff($selected, array_column($question['options'], 'id'))
            || ($question['type'] !== 'MULTIPLE' && count($selected) !== 1), 422, 'Pilihan jawaban tidak valid.');
        $snapshot['responses'][$questionId] = $optionId;
    }

    public function start(Request $request, string $quizId)
    {
        $profile = $this->context->profile($request);
        $id = DB::transaction(function () use ($profile, $quizId) {
            // Lock a stable parent to serialize the first attempt as well as retakes.
            $profile->newQuery()->where('id', $profile->id)->lockForUpdate()->firstOrFail();
            ZakatAcademyQuiz::where('id', $quizId)->lockForUpdate()->firstOrFail();
            $quiz = $this->context->quiz($quizId, $profile->id);
            abort_unless($this->context->released($quiz->chapter->course->startsAt, $quiz->releaseDay) && $quiz->isActive && (! $quiz->quizDate || ! $quiz->quizDate->isFuture()) && (! $quiz->closesAt || $quiz->closesAt->isFuture()), 403, 'Ujian belum dibuka atau sudah ditutup.');
            abort_if(! $quiz->questions->count() || $quiz->questions->contains(fn ($q) => $q->type === 'MULTIPLE' ? ! $q->options->contains('isCorrect', true) : $q->options->where('isCorrect', true)->count() !== 1), 422, 'Soal ujian belum siap.');
            $latest = ZakatAcademyQuizAttempt::where('profile_id', $profile->id)->where('quiz_id', $quizId)->orderByDesc('attempt_number')->lockForUpdate()->first();
            if ($latest && ! $latest->isCompleted) {
                $deadline = $this->deadline($latest);
                if (! $deadline->isFuture()) {
                    $this->finish($latest, $latest->answers, $deadline, $quiz->kind);
                    $latest->save();
                }

                return $latest->id;
            }
            abort_if($latest && ! $quiz->allowRetake, 409, 'Ujian ini hanya dapat dikerjakan satu kali.');
            $row = new ZakatAcademyQuizAttempt;
            $row->profileId = $profile->id;
            $row->quizId = $quizId;
            $row->attemptNumber = ($latest ? $latest->attemptNumber : 0) + 1;
            $row->answers = ['kind' => $quiz->kind, 'passingScore' => $quiz->passingScore, 'timeLimitMinutes' => $quiz->timeLimitMinutes, 'closesAt' => $quiz->closesAt?->toISOString(), 'questions' => $quiz->questions->toArray(), 'responses' => new \stdClass];
            $row->save();

            return $row->id;
        }, 3);

        return response()->json(['data' => $id], 201);
    }

    public function update(Request $request, string $id)
    {
        $profile = $this->context->profile($request);
        $data = $request->validate(['submit' => 'sometimes|boolean', 'answer' => 'nullable|array',
            'answer.questionId' => 'required_with:answer|string', 'answer.optionId' => 'required_with:answer',
            'answers' => 'nullable|array|max:100']);
        $result = DB::transaction(function () use ($profile, $id, $data) {
            $attempt = ZakatAcademyQuizAttempt::where('id', $id)->where('profile_id', $profile->id)->lockForUpdate()->firstOrFail();
            $quiz = $this->context->quiz($attempt->quizId, $profile->id);
            if ($attempt->isCompleted) {
                return ['completed' => true, 'quizId' => $attempt->quizId];
            }
            $snapshot = $attempt->answers;
            $deadline = $this->deadline($attempt);
            $expired = ! $deadline->isFuture();
            abort_if(! $expired && ! $quiz->isActive, 403, 'Ujian sedang dinonaktifkan.');
            if (! $expired && ! empty($data['answer'])) {
                $answer = $data['answer'];
                $this->storeAnswer($snapshot, $answer['questionId'], $answer['optionId']);
            }
            if (! $expired && ! empty($data['answers'])) {
                foreach ($data['answers'] as $questionId => $optionId) {
                    abort_unless(is_string($questionId), 422, 'Pilihan jawaban tidak valid.');
                    $this->storeAnswer($snapshot, $questionId, $optionId);
                }
            }
            $completed = ($data['submit'] ?? false) || $expired;
            $attempt->answers = $snapshot;
            if ($completed) {
                $this->finish($attempt, $snapshot, $expired ? $deadline : now(), $quiz->kind);
            } $attempt->save();

            return ['completed' => $completed, 'quizId' => $attempt->quizId];
        }, 3);

        return response()->json(['data' => $result]);
    }

    public function show(Request $request, string $quizId, string $id)
    {
        $profile = $this->context->profile($request);
        $quiz = $this->context->quiz($quizId, $profile->id);
        $attempt = ZakatAcademyQuizAttempt::where('id', $id)->where('quiz_id', $quizId)->where('profile_id', $profile->id)->firstOrFail();
        $data = $attempt->toArray();
        $data['quiz'] = ['title' => $quiz->title, 'closesAt' => $quiz->closesAt?->toISOString()];
        // Only the owner of a completed attempt can review the snapshotted answer keys.
        $snapshot = $data['answers'];
        $review = $attempt->isCompleted;
        if (! $review) {
            foreach ($snapshot['questions'] as &$question) {
                unset($question['explanation']);
                foreach ($question['options'] as &$option) {
                    unset($option['isCorrect']);
                } unset($option);
            }
        } unset($question);
        $data['answers'] = $snapshot;

        return response()->json(['data' => $data]);
    }
}
