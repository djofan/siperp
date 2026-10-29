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
            ->where('modules.slug', 'bantuan')->select(['users.id', 'users.name', 'users.is_active as active', 'module_access.role', 'bantuan_staff.region', 'bantuan_staff.roles as storedRoles']);
        if ($access->role($request) === 'admin') {
            $rows->addSelect(['users.email', 'users.is_superadmin as protectedAccount', 'bantuan_staff.can_bypass as canBypass']);
        }

        $people = $rows->orderBy('users.name')->get();
        foreach ($people as $person) {
            $person->roles = Access::expandRoles($person->role, $person->storedRoles);
            unset($person->storedRoles);
        }
        if ($access->role($request) === 'admin') {
            $moduleId = DB::table('modules')->where('slug', 'bantuan')->value('id');
            $sharedIds = DB::table('module_access')->where('module_id', '!=', $moduleId)->pluck('user_id')->all();
            foreach ($people as $person) {
                $person->sharedAccount = in_array($person->id, $sharedIds, true);
                $person->canManage = ! $person->protectedAccount && $person->id !== $request->user()->id;
                $person->canEditIdentity = $person->canManage && (! $person->sharedAccount || $request->user()->is_superadmin);
            }
        }

        return response()->json(['data' => $people]);
    }

    public function store(Request $request, Access $access, Journal $journal)
    {
        $access->allow($request, []);
        $input = $request->validate(['name' => 'required|string|max:191', 'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:12|max:72', 'role' => ['required_without:roles', Rule::in(Access::ROLES)],
            'roles' => 'sometimes|required|array|min:1|max:8', 'roles.*' => ['required', 'distinct', Rule::in(Access::ROLES)],
            'region' => 'nullable|string|max:191', 'canBypass' => 'required|boolean']);

        $input = $this->normalizeRoles($input);
        return DB::transaction(function () use ($request, $input, $journal) {
            $module = DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            if (in_array('approver', $input['roles'], true)) $this->validateApprover('approver', $module->id);
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
        $input = $request->validate(['role' => ['required_without:roles', Rule::in(Access::ROLES)], 'region' => 'nullable|string|max:191',
            'roles' => 'sometimes|required|array|min:1|max:8', 'roles.*' => ['required', 'distinct', Rule::in(Access::ROLES)],
            'name' => 'sometimes|required|string|max:191', 'email' => ['sometimes', 'required', 'email', 'max:191', Rule::unique('users', 'email')->ignore($id)],
            'canBypass' => 'required|boolean', 'active' => 'required|boolean', 'password' => 'nullable|string|min:12|max:72']);

        $input = $this->normalizeRoles($input);
        return DB::transaction(function () use ($request, $id, $input, $journal) {
            $module = DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            $user = User::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($user->is_superadmin || $id === $request->user()->id, 403, 'Akun superadmin dan akun sendiri dikelola melalui Core.');
            $entry = DB::table('module_access')->where('user_id', $id)->where('module_id', $module->id)->firstOrFail();
            $shared = DB::table('module_access')->where('user_id', $id)->where('module_id', '!=', $module->id)->exists();
            $identityChanged = (isset($input['name']) && $input['name'] !== $user->name) || (isset($input['email']) && $input['email'] !== $user->email) || ! empty($input['password']);
            abort_if($shared && $identityChanged && ! $request->user()->is_superadmin, 403, 'Identitas akun lintas modul hanya dapat diubah superadmin. Peran bantuan tetap bisa diedit.');
            if ($input['active'] && in_array('approver', $input['roles'], true)) $this->validateApprover('approver', $module->id, $id);
            $this->profile($id, $input);
            // A module admin can revoke this module, not disable a multi-module identity.
            DB::table('module_access')->where('id', $entry->id)->delete();
            if ($input['active']) {
                DB::table('module_access')->insert(['id' => $entry->id, 'user_id' => $id, 'module_id' => $module->id, 'role' => $input['role']]);
            }
            DB::table('bantuan_active_roles')->where('user_id', $id)->whereNotIn('role', $input['active'] ? $input['roles'] : [])->delete();
            if (! empty($input['password'])) {
                $user->password_hash = Hash::make($input['password']);
                $user->tokens()->delete();
            }
            $user->name = $input['name'] ?? $user->name;
            $user->email = $input['email'] ?? $user->email;
            $user->save();
            $journal->record($request, null, 'update_staff', null, ['userId' => $id, 'beforeRole' => $entry->role, 'role' => $input['role'], 'canBypass' => $input['canBypass'], 'active' => $input['active']]);

            return response()->json(['ok' => true]);
        });
    }

    public function destroy(Request $request, string $id, Access $access, Journal $journal)
    {
        $access->allow($request, []);

        return DB::transaction(function () use ($request, $id, $journal) {
            $module = DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            $user = User::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($user->is_superadmin || $id === $request->user()->id, 403, 'Akun superadmin dan akun sendiri tidak dapat dihapus dari modul ini.');
            DB::table('module_access')->where('user_id', $id)->where('module_id', $module->id)->firstOrFail();
            $activeAssignment = DB::table('bantuan_applications')->whereNotIn('status', ['completed', 'cancelled', 'returned', 'rejected_screening', 'rejected_t1', 'rejected_t2', 'rejected_bypass'])
                ->where(fn ($q) => $q->where('verifier_id', $id)->orWhere('distributor_id', $id))->exists();
            $activeSantunan = DB::table('bantuan_santunan')->where('volunteer_id', $id)->whereNull('completed_at')->exists();
            abort_if($activeAssignment || $activeSantunan, 409, 'Akun masih memiliki tugas aktif. Selesaikan atau alihkan penugasannya terlebih dahulu.');
            DB::table('module_access')->where('user_id', $id)->where('module_id', $module->id)->delete();
            DB::table('bantuan_staff')->where('user_id', $id)->delete();
            DB::table('bantuan_active_roles')->where('user_id', $id)->delete();
            DB::table('bantuan_notifications')->where('user_id', $id)->delete();
            $shared = DB::table('module_access')->where('user_id', $id)->exists();
            if (! $shared) {
                $user->is_active = false;
                $user->save();
                $user->tokens()->delete();
            }
            $journal->record($request, null, 'delete_staff', null, ['userId' => $id, 'name' => $user->name, 'sharedAccount' => $shared]);

            return response()->json(['ok' => true, 'sharedAccount' => $shared]);
        });
    }

    private function validateApprover(string $role, string $moduleId, ?string $except = null): void
    {
        $members = DB::table('module_access')->leftJoin('bantuan_staff', 'bantuan_staff.user_id', '=', 'module_access.user_id')->where('module_id', $moduleId)
            ->when($except, fn ($q) => $q->where('module_access.user_id', '!=', $except))->get(['module_access.role', 'bantuan_staff.roles']);
        abort_if($role === 'approver' && $members->contains(fn ($member) => in_array('approver', Access::expandRoles($member->role, $member->roles), true)), 422, 'Hanya satu akun Approver diperbolehkan.');
    }

    private function profile(string $id, array $data): void
    {
        abort_if($data['canBypass'] && ! array_intersect($data['roles'], ['call_center', 'verifier']), 422, 'Izin langsung hanya untuk Call Center atau Verifikator.');
        DB::table('bantuan_staff')->updateOrInsert(['user_id' => $id], ['region' => $data['region'] ?? null, 'can_bypass' => $data['canBypass'], 'roles' => json_encode($data['roles'], JSON_THROW_ON_ERROR)]);
    }

    private function normalizeRoles(array $data): array
    {
        $data['roles'] = $data['roles'] ?? [$data['role']];
        $data['role'] = $data['roles'][0];
        return $data;
    }
}
