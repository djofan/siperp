<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Journal;
use App\Modules\Core\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StaffController
{
    public function index(Request $request, Access $access)
    {
        $rows = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->join('users', 'users.id', '=', 'module_access.user_id')->leftJoin('bantuan_staff', 'bantuan_staff.user_id', '=', 'users.id')
            ->where('modules.slug', 'bantuan')->select(['users.id', 'users.name', 'users.is_active as active', 'module_access.role', 'bantuan_staff.region']);
        if ($access->role($request) === 'admin') {
            $rows->addSelect(['users.email', 'bantuan_staff.can_bypass as canBypass']);
        }

        return response()->json(['data' => $rows->orderBy('users.name')->get()]);
    }

    public function store(Request $request, Access $access, Journal $journal)
    {
        $access->allow($request, []);
        $input = $request->validate(['name' => 'required|string|max:191', 'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:12|max:72', 'role' => ['required', Rule::in(Access::ROLES)],
            'region' => 'nullable|string|max:191', 'canBypass' => 'required|boolean']);

        return DB::transaction(function () use ($request, $input, $journal) {
            $module = DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            $this->validateApprover($input['role'], $module->id);
            $user = new User;
            $user->forceFill(['name' => $input['name'], 'email' => $input['email'], 'password_hash' => Hash::make($input['password']), 'is_active' => true, 'is_superadmin' => false])->save();
            DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => $module->id, 'role' => $input['role']]);
            $this->profile($user->id, $input);
            $journal->record($request, null, 'create_staff', null, ['userId' => $user->id, 'role' => $input['role'], 'canBypass' => $input['canBypass']]);

            return response()->json(['data' => ['id' => $user->id]], 201);
        });
    }

    public function update(Request $request, string $id, Access $access, Journal $journal)
    {
        $access->allow($request, []);
        $input = $request->validate(['role' => ['required', Rule::in(Access::ROLES)], 'region' => 'nullable|string|max:191',
            'canBypass' => 'required|boolean', 'active' => 'required|boolean', 'password' => 'nullable|string|min:12|max:72']);

        return DB::transaction(function () use ($request, $id, $input, $journal) {
            $module = DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            $user = User::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($user->is_superadmin || $id === $request->user()->id, 403, 'Akun superadmin dan akun sendiri dikelola melalui Core.');
            $entry = DB::table('module_access')->where('user_id', $id)->where('module_id', $module->id)->firstOrFail();
            $this->validateApprover($input['role'], $module->id, $id);
            $this->profile($id, $input);
            // A module admin can revoke this module, not disable a multi-module identity.
            DB::table('module_access')->where('id', $entry->id)->delete();
            if ($input['active']) {
                DB::table('module_access')->insert(['id' => $entry->id, 'user_id' => $id, 'module_id' => $module->id, 'role' => $input['role']]);
            }
            if (! empty($input['password'])) {
                abort_if(DB::table('module_access')->where('user_id', $id)->where('module_id', '!=', $module->id)->exists(), 403, 'Reset akun lintas modul harus dilakukan superadmin melalui Core.');
                $user->password_hash = Hash::make($input['password']);
                $user->save();
                $user->tokens()->delete();
            }
            $journal->record($request, null, 'update_staff', null, ['userId' => $id, 'beforeRole' => $entry->role, 'role' => $input['role'], 'canBypass' => $input['canBypass'], 'active' => $input['active']]);

            return response()->json(['ok' => true]);
        });
    }

    private function validateApprover(string $role, string $moduleId, ?string $except = null): void
    {
        abort_if($role === 'approver' && DB::table('module_access')->where('module_id', $moduleId)->where('role', 'approver')
            ->when($except, fn ($q) => $q->where('user_id', '!=', $except))->exists(), 422, 'Hanya satu akun Approver diperbolehkan.');
    }

    private function profile(string $id, array $data): void
    {
        abort_if($data['canBypass'] && ! in_array($data['role'], ['call_center', 'verifier'], true), 422, 'Izin langsung hanya untuk Call Center atau Verifikator.');
        DB::table('bantuan_staff')->updateOrInsert(['user_id' => $id], ['region' => $data['region'] ?? null, 'can_bypass' => $data['canBypass']]);
    }
}
