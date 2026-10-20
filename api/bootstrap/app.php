<?php

use App\Http\Middleware\AuthenticateApiCookie;
use App\Http\Middleware\RequireValidJson;
use App\Http\Resources\ErrorResource;
use App\Modules\Core\Http\Middleware\RequireActiveUser;
use App\Modules\Core\Http\Middleware\RequireModuleAccess;
use App\Modules\Core\Http\Middleware\RequirePublicModule;
use App\Modules\Core\Http\Middleware\RequireSuperadmin;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', apiPrefix: 'api/v1', commands: __DIR__.'/../routes/console.php')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['module.access' => RequireModuleAccess::class, 'module.public' => RequirePublicModule::class, 'user.active' => RequireActiveUser::class, 'superadmin' => RequireSuperadmin::class]);
        $middleware->prependToGroup('api', AuthenticateApiCookie::class);
        $middleware->appendToGroup('api', RequireValidJson::class);
        // Bearer only: do not enable statefulApi().
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request, Throwable $e) => true);
        $exceptions->render(function (Throwable $e, Request $request) {
            $status = $e instanceof ValidationException ? 422 : ($e instanceof AuthenticationException ? 401 : ($e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500));
            $code = match ($status) {
                400 => 'bad_request', 409 => 'conflict', 401 => 'unauthenticated', 403 => 'forbidden', 404 => 'not_found', 422 => 'validation_failed', 429 => 'rate_limited', 501 => 'not_implemented', default => $status >= 500 ? 'server_error' : 'request_error'
            };
            $explicitHttpMessage = $e instanceof HttpExceptionInterface && trim($e->getMessage()) !== '';
            $message = $status >= 500 && ! $explicitHttpMessage ? 'An unexpected error occurred.' : $e->getMessage();

            return (new ErrorResource(['code' => $code, 'message' => $message, 'details' => $e instanceof ValidationException ? $e->errors() : (object) []]))
                ->response()->setStatusCode($status)->withHeaders($e instanceof HttpExceptionInterface ? $e->getHeaders() : []);
        });
    })->create();
