<?php

namespace App\Support\LearningControllers;

use App\Support\LearningFileStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubmissionController extends BaseController
{
    private function taskForStudent(Request $request, string $id, $member)
    {
        $member->refresh();
        abort_unless($member->groupId, 404);
        $model = $this->model($request, 'Task');
        $task = $model::whereHas('groups', fn ($query) => $query->where('group_id', $member->groupId))->whereKey($id)->lockForUpdate()->firstOrFail();
        abort_unless(now() <= $task->deadline, 409, 'Tenggat sudah lewat. Minta guru memperpanjang tenggat.');

        return $task;
    }

    public function media(Request $request, LearningFileStore $files)
    {
        $member = $this->member($request, 'peserta');
        $input = $request->validate(['taskId' => 'required|string|max:191', 'file' => 'required|file|max:51200']);
        $detected = $files->detect($request->file('file'));
        $path = null;
        $before = null;
        try {
            $row = DB::transaction(function () use ($request, $input, $member, $detected, $files, &$path, &$before) {
                $task = $this->taskForStudent($request, $input['taskId'], $member);
                abort_unless($task->type !== 'quiz', 422, 'Kuis dikerjakan langsung di halaman tugas.');
                $matches = $task->type === 'video' ? $detected['kind'] === 'video' : ($detected['kind'] === 'audio' || $detected['ext'] === 'webm');
                abort_unless($matches, 422, 'Format file tidak sesuai tipe tugas.');
                $existing = $task->submissions()->where('student_id', $member->id)->lockForUpdate()->first();
                abort_unless(! $existing || $existing->status === 'rejected', 409, 'Tugas ini sudah dikumpulkan.');
                $path = $files->save($this->module($request), 'submissions/'.$task->id.'/'.$member->id, $request->file('file'), $detected['ext']);
                $before = $existing?->filePath;
                $model = $this->model($request, 'Submission');
                $row = $existing ?? new $model;
                $row->forceFill(['taskId' => $task->id, 'studentId' => $member->id, 'filePath' => $path, 'fileMime' => $detected['mime'], 'status' => 'pending', 'attemptsCount' => $existing ? $existing->attemptsCount + 1 : 1, 'isLate' => now() > $task->originalDeadline, 'submittedAt' => now()])->save();

                return $row;
            }, 5);
        } catch (\Throwable $error) {
            if ($path) {
                $files->delete($this->module($request), $path);
            } throw $error;
        }
        if ($before) {
            $files->delete($this->module($request), $before);
        }

        return response()->json(['ok' => true, 'isLate' => $row->isLate]);
    }

    public function quiz(Request $request, string $id)
    {
        $member = $this->member($request, 'peserta');
        $answers = $request->validate(['answers' => 'required|array|max:100', 'answers.*' => 'required|in:a,b,c,d'])['answers'];
        $result = DB::transaction(function () use ($request, $id, $member, $answers): array {
            $task = $this->taskForStudent($request, $id, $member);
            abort_unless($task->type === 'quiz', 422, 'Tugas ini bukan kuis.');
            abort_if($task->submissions()->where('student_id', $member->id)->exists(), 409, 'Kuis ini sudah dikerjakan.');
            $questions = $task->questions()->orderBy('order')->get(['id', 'correct_option']);
            abort_unless($questions->isNotEmpty(), 422, 'Kuis belum punya soal.');
            $correct = 0;
            foreach ($questions as $question) {
                abort_unless(isset($answers[$question->id]), 422, 'Semua soal wajib dijawab.');
                if ($answers[$question->id] === $question->correctOption) {
                    $correct++;
                }
            }
            $score = (int) round($correct / $questions->count() * 100);
            $model = $this->model($request, 'Submission');
            $row = new $model;
            $late = now() > $task->originalDeadline;
            $row->forceFill(['taskId' => $task->id, 'studentId' => $member->id, 'status' => 'approved', 'attemptsCount' => 1, 'score' => $score, 'isLate' => $late, 'submittedAt' => now()])->save();
            $answerModel = $this->model($request, 'QuizAnswer');
            foreach ($questions as $question) {
                $answer = new $answerModel;
                $answer->forceFill(['submissionId' => $row->id, 'questionId' => $question->id, 'selectedOption' => $answers[$question->id], 'isCorrect' => $answers[$question->id] === $question->correctOption])->save();
            }

            return ['score' => $score, 'correct' => $correct, 'total' => $questions->count(), 'isLate' => $late];
        }, 5);

        return response()->json(['data' => $result], 201);
    }

    private function reviewScope(Request $request, $query, string $teacherId)
    {
        return $query->whereHas('task', function ($query) use ($request, $teacherId): void {
            $query->where('type', '!=', 'quiz')->where(function ($query) use ($request, $teacherId): void {
                $query->where('teacher_id', $teacherId);
                if ($this->module($request) === 'ojol') {
                    $query->orWhereHas('approvers', fn ($query) => $query->where('teacher_id', $teacherId));
                }
            });
        });
    }

    public function queue(Request $request)
    {
        $member = $this->member($request, 'guru');
        $model = $this->model($request, 'Submission');
        $query = $this->reviewScope($request, $model::with(['task', 'student.user:id,name'])->where('status', 'pending'), $member->id)->orderBy('submitted_at')->orderBy('id');

        return $this->page($request, $query, fn ($row) => ['id' => $row->id, 'attemptsCount' => $row->attemptsCount, 'isLate' => $row->isLate, 'submittedAt' => $row->submittedAt, 'task' => ['id' => $row->task->id, 'title' => $row->task->title, 'type' => $row->task->type], 'student' => ['code' => $row->student->code, 'user' => ['name' => $row->student->user->name]]]);
    }

    public function show(Request $request, string $id)
    {
        $member = $this->member($request, 'guru');
        $model = $this->model($request, 'Submission');
        $row = $model::findOrFail($id);
        abort_unless($this->canReview($request, $row->task, $member), 404);
        $student = $row->student;
        $data = ['id' => $row->id, 'status' => $row->status, 'attemptsCount' => $row->attemptsCount, 'isLate' => $row->isLate, 'submittedAt' => $row->submittedAt, 'fileMime' => $row->fileMime, 'filePath' => $row->filePath, 'score' => $row->score, 'task' => ['id' => $row->task->id, 'title' => $row->task->title, 'type' => $row->task->type, 'description' => $row->task->description], 'student' => ['code' => $student->code, 'teachingPlace' => $student->teachingPlace, 'group' => $student->group ? ['name' => $student->group->name] : null, 'user' => ['name' => $student->user->name]], 'logs' => app(TaskController::class)->logs($row), 'answers' => $row->answers()->with('question')->get()->map(fn ($answer) => ['questionId' => $answer->questionId, 'selectedOption' => $answer->selectedOption, 'isCorrect' => $answer->isCorrect, 'question' => $answer->question->toArray()])->all()];

        return response()->json(['data' => $data]);
    }

    public function review(Request $request, string $id)
    {
        $member = $this->member($request, 'guru');
        $input = $request->validate(['decision' => 'required|in:approved,rejected', 'feedback' => 'required_if:decision,rejected|nullable|string|max:5000']);
        DB::transaction(function () use ($request, $member, $id, $input): void {
            $model = $this->model($request, 'Submission');
            $row = $model::findOrFail($id);
            $taskModel = $this->model($request, 'Task');
            $task = $taskModel::whereKey($row->taskId)->lockForUpdate()->firstOrFail();
            abort_unless($task->type !== 'quiz' && $this->canReview($request, $task, $member), 404);
            $row = $model::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($row->status === 'pending', 409, 'Setoran ini sudah dikoreksi.');
            $row->status = $input['decision'];
            $row->save();
            $logModel = $this->model($request, 'SubmissionLog');
            $log = new $logModel;
            $log->forceFill(['submissionId' => $row->id, 'reviewerId' => $member->id, 'status' => $input['decision'], 'feedback' => trim($input['feedback'] ?? '') ?: 'Tugas disetujui.', 'attemptNumber' => $row->attemptsCount])->save();
        }, 5);

        return response()->json(['ok' => true]);
    }

    public function results(Request $request, string $id)
    {
        $context = $this->context($request);
        $model = $this->model($request, 'Task');
        $task = $model::findOrFail($id);
        abort_unless($context['admin'] || $this->canReview($request, $task, $context['member']), 404);

        return $this->page($request, $task->submissions()->with('student.user:id,name')->orderByDesc('score')->orderByDesc('submitted_at'), fn ($row) => ['id' => $row->id, 'status' => $row->status, 'attemptsCount' => $row->attemptsCount, 'isLate' => $row->isLate, 'score' => $row->score, 'submittedAt' => $row->submittedAt, 'student' => ['code' => $row->student->code, 'user' => ['name' => $row->student->user->name]], '_count' => ['answers' => $row->answers()->where('is_correct', true)->count()], 'answers' => $row->answers()->get(['id'])->toArray()]);
    }

    public function file(Request $request, string $id, LearningFileStore $files)
    {
        $context = $this->context($request);
        $model = $this->model($request, 'Submission');
        $row = $model::findOrFail($id);
        abort_unless($context['admin'] || $context['member']?->id === $row->studentId || $this->canReview($request, $row->task, $context['member']), 404);
        $path = $files->path($this->module($request), $row->filePath);
        abort_unless($path && $row->fileMime, 404);

        return response()->file($path, ['Content-Type' => $row->fileMime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function photo(Request $request, string $id, LearningFileStore $files)
    {
        $this->context($request);
        $model = $this->model($request, 'Member');
        $member = $model::findOrFail($id);
        $path = $files->path($this->module($request), $member->photo);
        $mime = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($member->photo ?? '', PATHINFO_EXTENSION)] ?? null;
        abort_unless($path && $mime, 404);

        return response()->file($path, ['Content-Type' => $mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
