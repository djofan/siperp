<?php

namespace App\Modules\Rapat\Http;

use Closure;
use Illuminate\Http\Request;

class PrivateAccess
{
    public function handle(Request $r, Closure $next)
    {
        abort_unless(in_array($r->attributes->get('module_role'), ['superadmin', 'admin', 'secretary', 'viewer'], true), 403);
        $response = $next($r);
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
