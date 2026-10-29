<?php

namespace App\Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RequirePublicModule
{
    public function handle(Request $request, Closure $next, string $slug): Response
    {
        $module = DB::table('modules')->where('slug', $slug)->first();
        $user = $request->user('sanctum');
        abort_unless($module && ($module->is_active || ($user && $user->is_active && $user->is_superadmin)), 404);

        return $next($request);
    }
}
