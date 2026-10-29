<?php

namespace App\Support\LearningControllers;

use App\Support\LearningFileStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskController extends BaseController
{
    public function data(Request $request, $task, bool $teacherDetails = false): array
    {
        $teacher = $task->teacher;
        $data = ['id' => $task->id, 'title' => $task->title, 'description' => $task->description, 'type' => $task->type, 'deadline' => $task->deadline, 'originalDeadline' => $task->originalDeadline, 'createdAt' => $task->createdAt, 'updatedAt' => $task->updatedAt, 'teacherId' => $task->teacherId, 'teacher' => $teacher ? ['user' => ['name' => $teacher->user->name]] : null];
        if ($teacherDetails) {
            $data['teacher'] = $teacher ? ['id' => $teacher->id, 'code' => $teacher->code, 'phone' => $teacher->phone, 'user' => ['name' => $teacher->user->name]] : null;
            $data['groups'] = $task->groups()->with('group')->get()->map(fn ($link) => ['group' => ['id' => $link->group->id, 'name' => $link->group->name, '_count' => ['members' => $link->group->members()->count()]]])->all();
            $data['_count'] = ['submissions' => $task->submissions()->count(), 'questions' => $task->questions()->count()];
            $data['submissions'] = $task->submissions()->where('status', 'pending')->get(['id'])->toArray();
            $data['approvers'] = $this->module($request) === 'ojol' ? $task->approvers()->with('teacher.user:id,name')->get()->map(fn ($link) => ['teacherId' => $link->teacherId, 'teacher' => ['id' => $link->teacher->id, 'code' => $link->teacher->code, 'user' => ['name' => $link->teacher->user->name]]])->all() : [];
        }

        return $data;
    }

    private function reviewQuery(Request $request, $query, string $teacherId)
    {
        return $query->where(function ($query) use ($request, $teacherId): void {
            $query->where('teacher_id', $teacherId);
            if ($this->module($request) === 'ojol') {
                $query->orWhereHas('approvers', fn ($query) => $query->where('teacher_id', $teacherId));
            }
        });
    }

    public function teacherList(Request $request)
    {
        $member = $this->member($request, 'guru');
        $model = $this->model($request, 'Task');

        return $this->page($request, $this->reviewQuery($request, $model::query(), $member->id)->orderByDesc('created_at')->orderBy('id'), fn ($task) => $this->data($request, $task, true));
    }

    public function adminList(Request $request)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Task');

        return $this->page($request, $model::orderByDesc('created_at')->orderBy('id'), fn ($task) => $this->data($request, $task, true));
    }

    public function teacherShow(Request $request, string $id)
    {
        $member = $this->member($request, 'guru');
        $model = $this->model($request, 'Task');
        $task = $model::findOrFail($id);
        abort_unless($this->canReview($request, $task, $member), 404);

        return response()->json(['data' => [...$this->data($request, $task, true), 'canManage' => $task->teacherId === $member->id, 'questions' => $task->questions()->orderBy('order')->get()->toArray()]]);
    }

    private function input(Request $request): array
    {
        $data = $request->validate(['title' => 'required|string|max:191', 'description' => 'required|string|max:10000', 'type' => 'required|in:voice_note,video,quiz', 'deadline' => 'required|date_format:Y-m-d\TH:i']);
        $data['deadline'] = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $data['deadline'], 'Asia/Jakarta')->utc();

        return $data;
    }

    private function questions(Request $request): array
    {
        $value = $request->input('questions');
        if (is_string($value)) {
            try {
                $value = json_decode($value, true, flags: JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw ValidationException::withMessages(['questions' => 'Data soal tidak valid.']);
            }
        }
        $request->merge(['questions' => $value]);
        $data = $request->validate(['questions' => 'required|array|min:1|max:100', 'questions.*.question' => 'required|string|max:10000', 'questions.*.optionA' => 'required|string|max:10000', 'questions.*.optionB' => 'required|string|max:10000', 'questions.*.optionC' => 'sometimes|nullable|string|max:10000', 'questions.*.optionD' => 'sometimes|nullable|string|max:10000', 'questions.*.correctOption' => 'required|in:a,b,c,d']);
        foreach ($data['questions'] as $index => $question) {
            if (! empty($question['optionD']) && empty($question['optionC'])) {
                throw ValidationException::withMessages(['questions' => 'Isi pilihan C sebelum D.']);
            }
            if (empty($question['option'.strtoupper($question['correctOption'])])) {
                throw ValidationException::withMessages(['questions' => 'Kunci jawaban harus pilihan yang terisi.']);
            }
        }

        return $data['questions'];
    }

    private function recipients(Request $request, $task, string $teacherId): void
    {
        $module = $this->module($request);
        $groupModel = $this->model($request, 'Group');
        if ($module === 'tanwir') {
            $groups = $groupModel::where('pic_id', $teacherId)->pluck('id')->all();
        } else {
            $request->merge(['groupIds' => (array) $request->input('groupIds', []), 'approverIds' => (array) $request->input('approverIds', [])]);
            $request->validate(['groupIds' => 'required|array|min:1|max:100', 'groupIds.*' => 'required|string|max:191', 'approverIds' => 'array|max:100', 'approverIds.*' => 'required|string|max:191']);
            $groups = array_values(array_unique((array) $request->input('groupIds', [])));
            $approvers = array_values(array_diff(array_unique((array) $request->input('approverIds', [])), [$teacherId]));
            abort_unless($groups && count($groups) <= 100 && $groupModel::whereIn('id', $groups)->count() === count($groups), 422, 'Pilih kelompok penerima yang valid.');
            $memberModel = $this->model($request, 'Member');
            abort_unless(count($approvers) <= 100 && $memberModel::where('role', 'guru')->whereIn('id', $approvers)->count() === count($approvers), 422, 'Co-reviewer harus guru yang terdaftar.');
            DB::table('ojol_task_approvers')->where('task_id', $task->id)->delete();
            foreach ($approvers as $id) {
                DB::table('ojol_task_approvers')->insert(['task_id' => $task->id, 'teacher_id' => $id]);
            }
        }
        DB::table($module.'_task_groups')->where('task_id', $task->id)->delete();
        foreach ($groups as $id) {
            DB::table($module.'_task_groups')->insert(['task_id' => $task->id, 'group_id' => $id]);
        }
    }

    private function saveQuestions(Request $request, $task, array $questions): void
    {
        $task->questions()->delete();
        $model = $this->model($request, 'QuizQuestion');
        foreach ($questions as $order => $input) {
            $row = new $model;
            $row->forceFill(['taskId' => $task->id, ...$input, 'order' => $order])->save();
        }
    }

    public function store(Request $request)
    {
        $member = $this->member($request, 'guru');
        $input = $this->input($request);
        abort_unless($input['deadline'] > now(), 422, 'Tenggat harus setelah waktu sekarang.');
        $questions = $input['type'] === 'quiz' ? $this->questions($request) : [];
        $row = DB::transaction(function () use ($request, $member, $input, $questions) {
            $this->lockRegistry($request);
            $model = $this->model($request, 'Task');
            $task = new $model;
            $task->forceFill(['teacherId' => $member->id, ...$input, 'originalDeadline' => $input['deadline']])->save();
            $this->saveQuestions($request, $task, $questions);
            $this->recipients($request, $task, $member->id);

            return $task;
        }, 5);

        return response()->json(['data' => ['id' => $row->id]], 201);
    }

    public function update(Request $request, string $id)
    {
        $member = $this->member($request, 'guru');
        $input = $this->input($request);
        DB::transaction(function () use ($request, $id, $member, $input): void {
            $this->lockRegistry($request);
            $model = $this->model($request, 'Task');
            $task = $model::where('teacher_id', $member->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            $submitted = $task->submissions()->exists();
            abort_if($submitted && $input['type'] !== $task->type, 422, 'Tipe tugas tidak bisa diubah setelah ada yang mengumpulkan.');
            // The browser edits minutes; retain seconds from an extension on an unchanged form.
            $changed = $task->deadline->format('Y-m-d H:i') !== $input['deadline']->format('Y-m-d H:i');
            abort_if($submitted && $changed, 422, 'Gunakan Perpanjang untuk mengubah tenggat setelah ada pengumpulan.');
            abort_if($changed && $input['deadline'] <= now(), 422, 'Tenggat harus setelah waktu sekarang.');
            if (! $changed) {
                unset($input['deadline']);
            }
            if (! $submitted && $changed) {
                $input['originalDeadline'] = $input['deadline'];
            }
            $task->forceFill($input)->save();
            if ($input['type'] === 'quiz' && ! $submitted) {
                $this->saveQuestions($request, $task, $this->questions($request));
            } elseif ($input['type'] !== 'quiz') {
                $task->questions()->delete();
            }
            $this->recipients($request, $task, $member->id);
        }, 5);

        return response()->json(['ok' => true]);
    }

    public function extend(Request $request, string $id)
    {
        $member = $this->member($request, 'guru');
        $hours = $request->validate(['hours' => 'required|integer|min:1|max:72'])['hours'];
        DB::transaction(function () use ($request, $member, $id, $hours): void {
            $model = $this->model($request, 'Task');
            $task = $model::where('teacher_id', $member->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless(now() > $task->deadline, 409, 'Tugas belum melewati tenggat.');
            $task->deadline = now()->addHours($hours);
            $task->save();
        }, 5);

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, string $id, LearningFileStore $files)
    {
        $context = $this->context($request);
        $model = $this->model($request, 'Task');
        $task = $model::findOrFail($id);
        abort_unless($context['admin'] || ($context['member']?->role === 'guru' && $task->teacherId === $context['member']->id), 404);
        $paths = $task->submissions()->pluck('file_path');
        $task->delete();
        foreach ($paths as $path) {
            $files->delete($this->module($request), $path);
        }

        return response()->json(['ok' => true]);
    }

    public function studentList(Request $request)
    {
        $member = $this->member($request, 'peserta');
        if (! $member->groupId) {
            return response()->json(['data' => [], 'current_page' => 1, 'last_page' => 1]);
        }
        $model = $this->model($request, 'Task');
        $query = $model::whereHas('groups', fn ($query) => $query->where('group_id', $member->groupId))->orderBy('deadline')->orderBy('id');

        return $this->page($request, $query, function ($task) use ($request, $member) {
            $submission = $task->submissions()->where('student_id', $member->id)->first();
            $locked = now() > $task->deadline;
            $state = $this->state($submission?->status, $locked);

            return [...$this->data($request, $task), 'submission' => $submission ? ['status' => $submission->status, 'score' => $submission->score, 'isLate' => $submission->isLate, 'attemptsCount' => $submission->attemptsCount] : null, 'locked' => $locked, 'state' => $state, 'dueSoon' => in_array($state, ['todo', 'rejected'], true) && $task->deadline < now()->addDay()];
        });
    }

    public function state(?string $status, bool $locked): string
    {
        if (in_array($status, ['pending', 'approved'], true)) {
            return $status;
        }
        if ($locked) {
            return 'locked';
        }

        return $status === 'rejected' ? 'rejected' : 'todo';
    }

    public function studentShow(Request $request, string $id)
    {
        $member = $this->member($request, 'peserta');
        $model = $this->model($request, 'Task');
        abort_unless($member->groupId, 404);
        $task = $model::whereHas('groups', fn ($query) => $query->where('group_id', $member->groupId))->findOrFail($id);
        $submission = $task->submissions()->where('student_id', $member->id)->first();
        $locked = now() > $task->deadline;
        $questions = [];
        if ($task->type === 'quiz') {
            $fields = ['id', 'question', 'option_a', 'option_b', 'option_c', 'option_d'];
            if ($submission) {
                $fields[] = 'correct_option';
            }
            $questions = $task->questions()->orderBy('order')->get($fields)->toArray();
        }
        $submissionData = $submission ? ['id' => $submission->id, 'status' => $submission->status, 'score' => $submission->score, 'isLate' => $submission->isLate, 'attemptsCount' => $submission->attemptsCount, 'submittedAt' => $submission->submittedAt, 'fileMime' => $submission->fileMime, 'logs' => $this->logs($submission), 'answers' => $submission->answers()->get(['question_id', 'selected_option', 'is_correct'])->toArray()] : null;
        $canSubmit = ! $locked && ($task->type === 'quiz' ? ! $submission : (! $submission || $submission->status === 'rejected'));

        return response()->json(['data' => ['task' => $this->data($request, $task), 'submission' => $submissionData, 'questions' => $questions, 'locked' => $locked, 'canSubmit' => $canSubmit, 'state' => $this->state($submission?->status, $locked)]]);
    }

    public function logs($submission): array
    {
        return $submission->logs()->with('reviewer.user:id,name')->orderByDesc('created_at')->get()->map(fn ($row) => ['id' => $row->id, 'status' => $row->status, 'feedback' => $row->feedback, 'attemptNumber' => $row->attemptNumber, 'createdAt' => $row->createdAt, 'reviewer' => $row->reviewer ? ['user' => ['name' => $row->reviewer->user->name]] : null])->all();
    }
}
