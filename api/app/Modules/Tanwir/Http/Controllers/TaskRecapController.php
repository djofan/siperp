<?php

namespace App\Modules\Tanwir\Http\Controllers;

use App\Modules\Tanwir\Models\TanwirGroup;
use App\Modules\Tanwir\Models\TanwirMember;
use App\Modules\Tanwir\Models\TanwirSubmission;
use App\Modules\Tanwir\Models\TanwirTask;
use App\Support\LearningContext;
use App\Support\LearningControllers\TaskController;
use Illuminate\Http\Request;

class TaskRecapController
{
    private function authorize(Request $request): void
    {
        app(LearningContext::class)->admin($request, 'tanwir');
    }

    private function filters(Request $request): array
    {
        return $request->validate([
            'group' => 'nullable|string|exists:tanwir_groups,id',
            'teacher' => 'nullable|string|exists:tanwir_members,id',
            'type' => 'nullable|in:voice_note,video,quiz',
            'status' => 'nullable|in:missing,pending,approved,rejected',
            'q' => 'nullable|string|max:200',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:50',
        ]);
    }

    private function person($member): ?array
    {
        return $member ? ['id' => $member->id, 'code' => $member->code, 'name' => $member->user?->name ?? 'Akun tidak tersedia'] : null;
    }

    private function groups()
    {
        return TanwirGroup::with('pic.user')->orderBy('name')->orderBy('id')->get()->map(fn ($group) => [
            'id' => $group->id, 'code' => $group->code, 'name' => $group->name, 'pic' => $this->person($group->pic),
        ])->values();
    }

    private function audience(TanwirTask $task)
    {
        // Existing submissions stay visible even after a member moves groups or a task's audience changes.
        return TanwirMember::whereHas('user')->where(function ($query) use ($task) {
            $query->where(fn ($current) => $current->where('role', 'peserta')->whereIn('group_id', $task->groups->pluck('groupId')))
                ->orWhereHas('submissions', fn ($sent) => $sent->where('task_id', $task->id));
        });
    }

    private function taskData(TanwirTask $task): array
    {
        return [
            'id' => $task->id, 'title' => $task->title, 'description' => $task->description, 'type' => $task->type,
            'createdAt' => $task->createdAt, 'deadline' => $task->deadline, 'originalDeadline' => $task->originalDeadline,
            'teacher' => $this->person($task->teacher),
            'groups' => $task->groups->map(fn ($link) => ['id' => $link->group->id, 'code' => $link->group->code, 'name' => $link->group->name])->values(),
        ];
    }

    private function page($page): array
    {
        return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()];
    }

    public function index(Request $request)
    {
        $this->authorize($request);
        $input = $this->filters($request);
        $tasks = TanwirTask::with(['teacher.user', 'groups.group'])->withCount([
            'submissions', 'submissions as pending_count' => fn ($q) => $q->where('status', 'pending'),
            'submissions as approved_count' => fn ($q) => $q->where('status', 'approved'),
            'submissions as rejected_count' => fn ($q) => $q->where('status', 'rejected'),
        ]);
        if (! empty($input['group'])) {
            $tasks->whereHas('groups', fn ($q) => $q->where('group_id', $input['group']));
        }
        if (! empty($input['teacher'])) {
            $tasks->where('teacher_id', $input['teacher']);
        }
        if (! empty($input['type'])) {
            $tasks->where('type', $input['type']);
        }
        if (! empty($input['q'])) {
            $tasks->where('title', 'like', '%'.$input['q'].'%');
        }
        $page = $tasks->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 25));
        $rows = $page->getCollection()->map(function ($task) {
            $total = $this->audience($task)->count();

            return [...$this->taskData($task), 'counts' => [
                'participants' => $total, 'submitted' => $task->submissions_count,
                'missing' => max(0, $total - $task->submissions_count),
                'pending' => $task->pending_count, 'approved' => $task->approved_count, 'rejected' => $task->rejected_count,
            ]];
        });

        return response()->json(['data' => [
            'tasks' => $rows, 'meta' => $this->page($page), 'groups' => $this->groups(),
            'teachers' => TanwirMember::with('user')->where('role', 'guru')->orderBy('code')->get()->map(fn ($member) => $this->person($member)),
        ]])->header('Cache-Control', 'private, no-store');
    }

    public function show(Request $request, string $id)
    {
        $this->authorize($request);
        $input = $this->filters($request);
        $task = TanwirTask::with(['teacher.user', 'groups.group', 'questions' => fn ($q) => $q->orderBy('order')->orderBy('id')])->findOrFail($id);
        $audience = $this->audience($task);
        if (! empty($input['group'])) {
            $audience->where('group_id', $input['group']);
        }
        $summary = ['participants' => (clone $audience)->count()];
        foreach (['pending', 'approved', 'rejected'] as $status) {
            $summary[$status] = (clone $audience)->whereHas('submissions', fn ($q) => $q->where('task_id', $id)->where('status', $status))->count();
        }
        $summary['submitted'] = $summary['pending'] + $summary['approved'] + $summary['rejected'];
        $summary['missing'] = $summary['participants'] - $summary['submitted'];
        if (! empty($input['q'])) {
            $audience->where(fn ($q) => $q->where('code', 'like', '%'.$input['q'].'%')->orWhereHas('user', fn ($u) => $u->where('name', 'like', '%'.$input['q'].'%')));
        }
        if (! empty($input['status'])) {
            if ($input['status'] === 'missing') {
                $audience->whereDoesntHave('submissions', fn ($q) => $q->where('task_id', $id));
            } else {
                $audience->whereHas('submissions', fn ($q) => $q->where('task_id', $id)->where('status', $input['status']));
            }
        }
        $page = $audience->with(['user', 'group', 'submissions' => fn ($q) => $q->where('task_id', $id)])->orderBy('code')->orderBy('id')->paginate($request->integer('per_page', 25));
        $rows = $page->getCollection()->map(function ($member) use ($task) {
            $sent = $member->submissions->first();

            return [...$this->person($member), 'active' => (bool) $member->user->is_active,
                'group' => $member->group ? ['id' => $member->group->id, 'code' => $member->group->code, 'name' => $member->group->name] : null,
                'currentlyAssigned' => $member->role === 'peserta' && $task->groups->contains('groupId', $member->groupId),
                'submission' => $sent ? ['id' => $sent->id, 'status' => $sent->status, 'score' => $sent->score, 'attemptsCount' => $sent->attemptsCount, 'isLate' => $sent->isLate, 'submittedAt' => $sent->submittedAt] : null,
            ];
        });

        return response()->json(['data' => ['task' => [...$this->taskData($task), 'questions' => $task->questions->map(fn ($q) => $this->question($q))],
            'participants' => $rows, 'summary' => $summary, 'groups' => $this->groups(), 'meta' => $this->page($page),
        ]])->header('Cache-Control', 'private, no-store');
    }

    private function question($q): array
    {
        return ['id' => $q->id, 'order' => $q->order, 'question' => $q->question, 'optionA' => $q->optionA, 'optionB' => $q->optionB, 'optionC' => $q->optionC, 'optionD' => $q->optionD, 'correctOption' => $q->correctOption];
    }

    public function submission(Request $request, string $id)
    {
        $this->authorize($request);
        $row = TanwirSubmission::with(['task.teacher.user', 'task.groups.group', 'student.user', 'student.group', 'answers.question'])->findOrFail($id);

        return response()->json(['data' => [
            'id' => $row->id, 'status' => $row->status, 'score' => $row->score, 'attemptsCount' => $row->attemptsCount,
            'isLate' => $row->isLate, 'submittedAt' => $row->submittedAt, 'fileMime' => $row->fileMime, 'files' => $row->mediaMetadata(),
            'task' => $this->taskData($row->task), 'student' => [...$this->person($row->student), 'group' => $row->student->group ? ['name' => $row->student->group->name] : null],
            'answers' => $row->answers->map(fn ($answer) => ['questionId' => $answer->questionId, 'selectedOption' => $answer->selectedOption, 'isCorrect' => $answer->isCorrect, 'question' => $answer->question ? $this->question($answer->question) : null]),
            'logs' => app(TaskController::class)->logs($row),
        ]])->header('Cache-Control', 'private, no-store');
    }
}
