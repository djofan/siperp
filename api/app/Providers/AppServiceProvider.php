<?php

namespace App\Providers;

use App\Modules\Core\Models\PersonalAccessToken;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;
use LogicException;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if ($this->app->runningInConsole() && in_array('serve', $_SERVER['argv'] ?? [], true)) {
            $existing = getenv('PHP_INI_SCAN_DIR');
            $directories = $existing !== false ? [$existing] : array_unique(array_map('dirname', array_filter(array_map('trim', explode(',', php_ini_scanned_files() ?: '')))));
            $directories[] = base_path('php.d');
            $scanPath = implode(PATH_SEPARATOR, $directories);
            putenv('PHP_INI_SCAN_DIR='.$scanPath);
            $_ENV['PHP_INI_SCAN_DIR'] = $scanPath;
            \Illuminate\Foundation\Console\ServeCommand::$passthroughVariables[] = 'PHP_INI_SCAN_DIR';
        }
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
        $testingSqlite = $this->app->environment('testing') && config('database.default') === 'sqlite' && config('database.connections.sqlite.database') === ':memory:';
        $driver = config('database.default');
        if (! $testingSqlite && $this->app->environment('local') && ($driver !== 'mysql' || config('database.connections.mysql.database') !== 'sipmodular_laravel_dev' || config('database.connections.mysql.url'))) {
            throw new LogicException('Local development requires the isolated sipmodular_laravel_dev MySQL database and no DB_URL override.');
        }
        if (! $testingSqlite && ! $this->app->environment('local') && ! in_array($driver, ['mysql', 'mariadb'], true)) {
            throw new LogicException('The production API requires a MySQL or MariaDB database.');
        }
        RateLimiter::for('login', function (Request $request): Limit {
            $email = $request->input('email') ?? $request->input('code') ?? $request->input('nip');
            $normalized = is_string($email) ? strtolower(trim($email)) : '';

            return Limit::perMinute(5)->by(hash('sha256', $normalized.'|'.$request->ip()));
        });
        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('payment-status', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
