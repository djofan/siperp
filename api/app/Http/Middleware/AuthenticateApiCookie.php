<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Same-origin frontend requests carry an opaque HttpOnly token cookie.
// SSR requests use an explicit Bearer header. Laravel owns both authentication paths.
class AuthenticateApiCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken() && ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true) && $request->header('Origin') !== null) {
            abort_unless(in_array(rtrim($request->header('Origin'), '/'), config('frontend.origins'), true), 403, 'Request origin is not allowed.');
        }
        if (! $request->bearerToken() && $request->cookie('sip_session')) {
            if (! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
                $origin = $request->header('Origin');
                $allowed = config('frontend.origins');
                abort_unless(is_string($origin) && in_array(rtrim($origin, '/'), $allowed, true), 403, 'Request origin is not allowed.');
            }
            $request->headers->set('Authorization', 'Bearer '.$request->cookie('sip_session'));
        }

        return $next($request);
    }
}
