<?php

namespace App\Support\LearningControllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupController extends BaseController
{
    public function index(Request $request)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Group');

        return $this->page($request, $model::orderBy('code'), fn ($group) => $this->groupData($request, $group));
    }

    public function show(Request $request, string $id)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Group');
        $group = $model::findOrFail($id);
        $data = $this->groupData($request, $group);
        $data['members'] = $group->members()->with('user:id,name,is_active')->orderBy('code')->get()->map(fn ($member) => ['id' => $member->id, 'code' => $member->code, 'phone' => $member->phone, 'teachingPlace' => $member->teachingPlace, 'user' => ['name' => $member->user->name, 'isActive' => $member->user->is_active]])->all();

        return response()->json(['data' => $data]);
    }

    private function input(Request $request): array
    {
        $rules = ['name' => 'required|string|max:191', 'description' => 'sometimes|nullable|string|max:5000'];
        if ($this->module($request) === 'tanwir') {
            $rules['picId'] = 'required|string|max:191';
        }
        $input = $request->validate($rules);
        if (isset($input['picId'])) {
            $model = $this->model($request, 'Member');
            abort_unless($model::whereKey($input['picId'])->where('role', 'guru')->exists(), 422, 'Guru PIC tidak ditemukan.');
        }

        return $input;
    }

    public function store(Request $request)
    {
        $this->context($request, true);
        $input = $this->input($request);
        $group = DB::transaction(function () use ($request, $input) {
            $this->lockRegistry($request);
            $model = $this->model($request, 'Group');
            $prefix = $this->module($request) === 'tanwir' ? 'TQ' : 'OM';
            $sequence = $model::count();
            do {
                $code = $prefix.str_pad((string) ++$sequence, 3, '0', STR_PAD_LEFT);
            } while ($model::where('code', $code)->exists());
            $group = new $model;
            $group->forceFill(['code' => $code, ...$input])->save();
            if (isset($input['picId'])) {
                $this->syncTasks($request, $input['picId']);
            }

            return $group;
        }, 5);

        return response()->json(['data' => ['id' => $group->id]], 201);
    }

    public function update(Request $request, string $id)
    {
        $this->context($request, true);
        $input = $this->input($request);
        DB::transaction(function () use ($request, $id, $input): void {
            $this->lockRegistry($request);
            $model = $this->model($request, 'Group');
            $group = $model::whereKey($id)->lockForUpdate()->firstOrFail();
            $before = $group->picId;
            $group->forceFill($input)->save();
            if ($this->module($request) === 'tanwir') {
                if ($before && $before !== $input['picId']) {
                    $this->syncTasks($request, $before);
                }
                $this->syncTasks($request, $input['picId']);
            }
        }, 5);

        return response()->json(['ok' => true]);
    }

    public function syncTasks(Request $request, string $teacherId): void
    {
        $taskModel = $this->model($request, 'Task');
        $groupModel = $this->model($request, 'Group');
        $ids = $groupModel::where('pic_id', $teacherId)->pluck('id');
        foreach ($taskModel::where('teacher_id', $teacherId)->orderBy('id')->lockForUpdate()->get() as $task) {
            DB::table('tanwir_task_groups')->where('task_id', $task->id)->delete();
            foreach ($ids as $id) {
                DB::table('tanwir_task_groups')->insert(['task_id' => $task->id, 'group_id' => $id]);
            }
        }
    }

    public function destroy(Request $request, string $id)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Group');
        $model::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }

    public function options(Request $request)
    {
        $context = $this->context($request);
        abort_unless($context['admin'] || $context['member']?->role === 'guru', 403);
        $model = $this->model($request, 'Group');

        return response()->json(['data' => $model::orderBy('code')->get(['id', 'code', 'name'])]);
    }

    public function teachers(Request $request)
    {
        $context = $this->context($request);
        abort_unless($context['admin'] || $context['member']?->role === 'guru', 403);
        $model = $this->model($request, 'Member');
        $rows = $model::with('user:id,name')->where('role', 'guru')->orderBy('code')->get();

        return response()->json(['data' => $rows->map(fn ($member) => ['id' => $member->id, 'code' => $member->code, 'user' => ['name' => $member->user->name]])]);
    }

    public function studentGroup(Request $request)
    {
        $member = $this->member($request, 'peserta');

        return response()->json(['data' => $member->group ? $this->groupData($request, $member->group) : null]);
    }
}
