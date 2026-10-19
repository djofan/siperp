<?php

namespace App\Support\LearningControllers;

use App\Modules\Tanwir\Models\TanwirStudent;
use Illuminate\Http\Request;

class DashboardController extends BaseController
{
    public function admin(Request $request)
    {
        $this->context($request, true);
        $member = $this->model($request, 'Member');
        $group = $this->model($request, 'Group');
        $task = $this->model($request, 'Task');
        $submission = $this->model($request, 'Submission');
        $summary = ['guru' => $member::where('role', 'guru')->count(), 'peserta' => $member::where('role', 'peserta')->count(), 'groups' => $group::count(), 'tasks' => $task::count(), 'pending' => $submission::where('status', 'pending')->count()];
        if ($this->module($request) === 'tanwir') {
            $summary['students'] = TanwirStudent::count();
        }

        return response()->json(['data' => $summary]);
    }

    public function map(Request $request)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Member');
        $rows = $model::with('user:id,name')->whereNotNull('latitude')->whereNotNull('longitude')->get();

        return response()->json(['data' => $rows->map(fn ($row) => ['name' => $row->user->name, 'role' => $row->role, 'place' => implode(', ', array_filter([$row->cityName, $row->provinceName])), 'lat' => (float) $row->latitude, 'lng' => (float) $row->longitude])]);
    }

    public function recent(Request $request)
    {
        $this->context($request, true);
        $request->validate(['limit' => 'sometimes|integer|min:1|max:100']);
        $model = $this->model($request, 'Member');
        $rows = $model::with('user:id,name')->orderByDesc('created_at')->limit($request->integer('limit', 6))->get();

        return response()->json(['data' => $rows->map(fn ($row) => ['id' => $row->id, 'code' => $row->code, 'role' => $row->role, 'createdAt' => $row->createdAt, 'user' => ['name' => $row->user->name]])]);
    }

    public function teacher(Request $request)
    {
        $member = $this->member($request, 'guru');
        $taskModel = $this->model($request, 'Task');
        $submissionModel = $this->model($request, 'Submission');
        $logModel = $this->model($request, 'SubmissionLog');
        $scope = fn ($query) => $query->where(function ($query) use ($request, $member): void {
            $query->where('teacher_id', $member->id);
            if ($this->module($request) === 'ojol') {
                $query->orWhereHas('approvers', fn ($query) => $query->where('teacher_id', $member->id));
            }
        });
        $pending = $submissionModel::where('status', 'pending')->whereHas('task', fn ($query) => $scope($query->where('type', '!=', 'quiz')))->count();
        $data = ['pending' => $pending, 'tasks' => $taskModel::where('teacher_id', $member->id)->count(), 'reviewed' => $logModel::where('reviewer_id', $member->id)->count()];
        if ($this->module($request) === 'tanwir') {
            $groupModel = $this->model($request, 'Group');
            $groups = $groupModel::where('pic_id', $member->id)->orderBy('code')->get()->map(function ($group) {
                return ['id' => $group->id, 'code' => $group->code, 'name' => $group->name, 'members' => $group->members()->with('user:id,name,is_active')->orderBy('code')->get()->map(fn ($row) => ['id' => $row->id, 'code' => $row->code, 'teachingPlace' => $row->teachingPlace, 'phone' => $row->phone, 'user' => ['name' => $row->user->name, 'isActive' => $row->user->is_active], '_count' => ['submissions' => $row->submissions()->count(), 'students' => $row->students()->count()]])->all()];
            });
            $data['groups'] = $groups;
        } else {
            $data['activeTasks'] = $scope($taskModel::where('deadline', '>', now()))->orderBy('deadline')->limit(5)->get()->map(fn ($task) => app(TaskController::class)->data($request, $task, true));
        }

        return response()->json(['data' => $data]);
    }
}
