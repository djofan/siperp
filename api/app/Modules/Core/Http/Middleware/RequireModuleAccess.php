<?php

namespace App\Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RequireModuleAccess
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();
        abort_unless($user?->is_active, 401, 'Account is inactive.');
        $registered = DB::table('modules')->where('slug', $module)->first();
        abort_unless($registered, 404);
        if (! $user->is_superadmin) {
            abort_unless($registered->is_active, 403, 'Module is inactive.');
            $role = DB::table('module_access')->where('user_id', $user->id)->where('module_id', $registered->id)->value('role');
            abort_unless($role, 403, 'Tidak diizinkan.');
            $request->attributes->set('module_role', $role);
        } else {
            $request->attributes->set('module_role', 'superadmin');
        }

        return $next($request);
    }
}
