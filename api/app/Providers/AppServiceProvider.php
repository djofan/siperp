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
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
        if (config('database.default') !== 'mysql' || config('database.connections.mysql.database') !== 'sipmodular_laravel_dev' || config('database.connections.mysql.url')) {
            throw new LogicException('API requires the isolated sipmodular_laravel_dev MySQL database and no DB_URL override.');
        }
        RateLimiter::for('login', function (Request $request): Limit {
            $email = $request->input('email');
            $normalized = is_string($email) ? strtolower(trim($email)) : '';

            return Limit::perMinute(5)->by(hash('sha256', $normalized.'|'.$request->ip()));
        });
    }
}
