<?php

namespace App\Support\LearningControllers;

use App\Support\LearningContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

abstract class BaseController
{
    protected function module(Request $request): string
    {
        $module = $request->route('learningModule');
        abort_unless(in_array($module, ['tanwir', 'ojol'], true), 404);

        return $module;
    }

    protected function model(Request $request, string $suffix): string
    {
        $module = ucfirst($this->module($request));

        return 'App\\Modules\\'.$module.'\\Models\\'.$module.$suffix;
    }

    protected function context(Request $request, bool $admin = false): array
    {
        $service = app(LearningContext::class);

        return $admin ? $service->admin($request, $this->module($request)) : $service->read($request, $this->module($request));
    }

    protected function member(Request $request, ?string $role = null)
    {
        return app(LearningContext::class)->member($request, $this->module($request), $role);
    }

    protected function page(Request $request, $query, ?callable $transform = null)
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $page = $query->paginate($request->integer('per_page', 100));
        if ($transform) {
            $page->through($transform);
        }

        return response()->json($page);
    }

    protected function userData($user): ?array
    {
        return $user ? ['name' => $user->name, 'email' => $user->email, 'isActive' => (bool) $user->is_active] : null;
    }

    protected function groupData(Request $request, $group): array
    {
        $data = $group->toArray();
        $data['_count'] = ['members' => $group->members()->count(), 'tasks' => $group->tasks()->count()];
        if ($this->module($request) === 'tanwir') {
            $pic = $group->pic;
            $data['pic'] = $pic ? ['id' => $pic->id, 'code' => $pic->code, 'phone' => $pic->phone, 'user' => ['name' => $pic->user->name]] : null;
        } else {
            $data['pic'] = null;
            $data['picId'] = null;
        }

        return $data;
    }

    protected function memberData(Request $request, $member, bool $full = false): array
    {
        $data = $full ? $member->toArray() : ['id' => $member->id, 'code' => $member->code, 'role' => $member->role, 'phone' => $member->phone, 'gender' => $member->gender, 'photo' => $member->photo, 'teachingPlace' => $member->teachingPlace, 'cityName' => $member->cityName, 'provinceName' => $member->provinceName, 'createdAt' => $member->createdAt];
        $data['user'] = $this->userData($member->user);
        $group = $member->group;
        $data['group'] = $group ? ['id' => $group->id, 'name' => $group->name, 'code' => $group->code] : null;
        $data['picGroups'] = $this->module($request) === 'tanwir' ? $member->picGroups()->get(['id', 'name'])->toArray() : [];
        $data['_count'] = ['tasks' => $member->tasks()->count(), 'submissions' => $member->submissions()->count()];

        return $data;
    }

    protected function lockRegistry(Request $request): void
    {
        DB::table('modules')->where('slug', $this->module($request))->lockForUpdate()->first();
    }

    protected function canReview(Request $request, $task, $member): bool
    {
        return $member && ($task->teacherId === $member->id || ($this->module($request) === 'ojol' && $task->approvers()->where('teacher_id', $member->id)->exists()));
    }
}
