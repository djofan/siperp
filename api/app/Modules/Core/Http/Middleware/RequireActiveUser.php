<?php

namespace App\Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->is_active, 401, 'Account is inactive.');

        return $next($request);
    }
}
