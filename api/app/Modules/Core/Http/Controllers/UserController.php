<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\User;
use App\Modules\Core\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController
{
    private function representation(User $user): array
    {
        $access = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)
            ->get(['module_access.id', 'module_access.role', 'modules.id as module_id', 'modules.name', 'modules.slug'])
            ->map(fn ($row) => ['id' => $row->id, 'role' => $row->role, 'module' => ['id' => $row->module_id, 'name' => $row->name, 'slug' => $row->slug]])->all();

        return ['id' => $user->id, 'name' => $user->name, 'code' => $user->code, 'email' => str_ends_with($user->email, '.invalid') ? '' : $user->email, 'isSuperadmin' => $user->is_superadmin, 'isActive' => $user->is_active, 'createdAt' => $user->created_at, 'moduleAccess' => $access];
    }

    public function index(): JsonResponse
    {
        return response()->json(['data' => User::orderBy('created_at')->get()->map(fn ($user) => $this->representation($user))]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => $this->representation(User::findOrFail($id))]);
    }

    public function store(Request $request, UserService $users): JsonResponse
    {
        $input = $request->validate(['name' => 'required|string|max:191', 'email' => 'nullable|email|max:191|unique:users,email', 'password' => 'required|string|min:8|max:72', 'isSuperadmin' => 'sometimes|boolean', 'moduleIds' => 'sometimes|array', 'moduleIds.*' => 'string|distinct|exists:modules,id']);
        abort_if($input['isSuperadmin'] ?? false, 422, 'Superadmin hanya satu, yaitu SASIP01. Halaman ini hanya membuat admin biasa.');

        return response()->json(['ok' => true, 'data' => $this->representation($users->create($input))], 201);
    }

    public function update(Request $request, string $id, UserService $users): JsonResponse
    {
        $input = $request->validate(['name' => 'required|string|max:191', 'email' => ['nullable', 'email', 'max:191', Rule::unique('users', 'email')->ignore($id)], 'password' => 'sometimes|nullable|string|min:8|max:72']);

        return response()->json(['ok' => true, 'data' => $this->representation($users->update($id, $input))]);
    }

    public function destroy(Request $request, string $id, UserService $users): JsonResponse
    {
        $users->delete($id, $request->user()->id);

        return response()->json(['ok' => true]);
    }

    public function status(Request $request, string $id, UserService $users): JsonResponse
    {
        $data = $request->validate(['isActive' => 'required|boolean']);
        $users->setActive($id, $data['isActive']);

        return response()->json(['ok' => true]);
    }

    public function access(Request $request, string $id, UserService $users): JsonResponse
    {
        $data = $request->validate(['entries' => 'required|array', 'entries.*.moduleId' => 'required|string|distinct|exists:modules,id', 'entries.*.role' => 'required|string']);
        $users->setAccess($id, $data['entries']);

        return response()->json(['ok' => true]);
    }
}
