<?php

namespace App\Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireModuleAccess
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        // Fail closed until Core migration implements per-request DB authorization.
        // Read users.is_active/is_superadmin, modules.is_active and module_access;
        // never authorize using token claims or abilities as module membership.
        abort(501, 'Module authorization is not implemented.');
    }
}
