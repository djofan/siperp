<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LearningContext
{
    public function read(Request $request, string $module): array
    {
        abort_unless(in_array($module, ['tanwir', 'ojol'], true), 404);
        $user = $request->user();
        abort_unless($user?->is_active, 401);
        $registration = DB::table('modules')->where('slug', $module)->first();
        abort_unless($registration && ($registration->is_active || $user->is_superadmin), 404);
        $role = DB::table('module_access')->where('user_id', $user->id)->where('module_id', $registration->id)->value('role');
        $model = 'App\\Modules\\'.ucfirst($module).'\\Models\\'.ucfirst($module).'Member';
        $member = $model::where('user_id', $user->id)->first();
        $admin = $user->is_superadmin || $role === 'admin';
        abort_unless($admin || $member, 403);

        return ['user' => $user, 'member' => $member, 'admin' => $admin, 'registration' => $registration];
    }

    public function admin(Request $request, string $module): array
    {
        $context = $this->read($request, $module);
        abort_unless($context['admin'], 403);

        return $context;
    }

    public function member(Request $request, string $module, ?string $role = null)
    {
        $context = $this->read($request, $module);
        abort_unless($context['member'] && (! $role || $context['member']->role === $role), 403);

        return $context['member'];
    }
}
