<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModuleController
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Module::orderBy('name')->get()]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $module = Module::where('slug', $slug)->firstOrFail();

        return response()->json(['data' => $module]);
    }

    public function status(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['isActive' => 'required|boolean']);
        $module = Module::findOrFail($id);
        $module->isActive = $data['isActive'];
        $module->save();

        return response()->json(['ok' => true]);
    }

    public function overview(): JsonResponse
    {
        return response()->json(['data' => [
            'users' => DB::table('users')->count(), 'superadmins' => DB::table('users')->where('is_superadmin', true)->count(),
            'activeModules' => DB::table('modules')->where('is_active', true)->count(),
            'accessChanges' => DB::table('access_logs')->where('created_at', '>=', now()->subDays(7))->count(),
        ]]);
    }

    public function activity(Request $request): JsonResponse
    {
        $data = $request->validate(['limit' => 'sometimes|integer|min:1|max:100']);

        return response()->json(['data' => DB::table('access_logs')->orderByDesc('created_at')->limit($data['limit'] ?? 8)->get()->map(fn ($row) => ['id' => $row->id, 'message' => $row->message, 'createdAt' => $row->created_at])]);
    }
}
