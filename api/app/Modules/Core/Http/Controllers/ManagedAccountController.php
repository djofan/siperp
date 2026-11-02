<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\User;
use App\Modules\Core\Services\ManagedAccounts;
use App\Modules\Core\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ManagedAccountController
{
    public function index(Request $request, ManagedAccounts $accounts)
    {
        $modules = $accounts->modules($request->user());
        abort_unless($modules, 403, 'Hanya admin modul yang dapat mengelola akun.');
        $users = DB::table('users')->join('module_access', 'module_access.user_id', '=', 'users.id')
            ->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->whereIn('modules.id', array_column($modules, 'id'))->where('module_access.role', '!=', 'admin')->where('users.is_superadmin', false)
            ->orderBy('users.name')->get(['users.id', 'users.name', 'users.code', 'users.is_active as active', 'modules.name as moduleName', 'module_access.role']);
        return response()->json(['data' => ['modules' => $modules, 'accounts' => $users]]);
    }

    public function store(Request $request, ManagedAccounts $accounts, UserService $users)
    {
        $input = $request->validate(['moduleId' => 'required|string', 'role' => 'required|string', 'name' => 'required|string|max:191',
            'email' => 'nullable|email|max:191|unique:users,email', 'password' => 'required|string|min:12|max:72',
            'isSuperadmin' => 'prohibited', 'is_superadmin' => 'prohibited', 'moduleIds' => 'prohibited', 'entries' => 'prohibited', 'code' => 'prohibited']);
        return DB::transaction(function () use ($request, $input, $accounts, $users) {
            DB::table('modules')->where('id', $input['moduleId'])->lockForUpdate()->firstOrFail();
            $module = collect($accounts->modules($request->user()))->firstWhere('id', $input['moduleId']);
            abort_unless($module, 403, 'Anda hanya dapat membuat akun pada modul yang Anda kelola.');
            abort_unless($input['role'] !== 'admin' && array_key_exists($input['role'], $module['roles']), 422, 'Peran tidak diizinkan. Gunakan menu pendaftaran khusus modul untuk akun lapangan atau peserta.');
            $user = new User;
            $user->forceFill(['name' => trim($input['name']), 'email' => $input['email'] ?? null, 'password_hash' => Hash::make($input['password']), 'is_active' => true, 'is_superadmin' => false])->save();
            DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => $module['id'], 'role' => $input['role']]);
            $users->log($request->user()->name.' membuat akun '.$user->name.' untuk '.$module['name'].' sebagai '.$input['role']);
            return response()->json(['data' => ['id' => $user->id, 'name' => $user->name, 'code' => $user->code]], 201);
        });
    }
}
