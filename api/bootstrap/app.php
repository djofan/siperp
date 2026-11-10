<?php

use App\Http\Middleware\AuthenticateApiCookie;
use App\Http\Middleware\RequireValidJson;
use App\Modules\Core\Http\Middleware\RequireActiveUser;
use App\Modules\Core\Http\Middleware\RequireModuleAccess;
use App\Modules\Core\Http\Middleware\RequirePublicModule;
use App\Modules\Core\Http\Middleware\RequireSuperadmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

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
        $exceptions->report(function (Throwable $error) {
            $request = request();
            if ($request->is('api/*')) {
                \App\Support\ApiProblem::report($error, $request);
                return false;
            }
            return null;
        });
        $exceptions->render(fn (Throwable $error, Request $request) => \App\Support\ApiProblem::response($error, $request));
    })->create();
