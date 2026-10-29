<?php

namespace App\Modules\Bantuan\Providers;

use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Reminders;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\ServiceProvider;

class BantuanServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\ModuleSessions::class)->register('bantuan', \App\Modules\Bantuan\Services\BantuanSession::class);
        config(['modules.roles.bantuan' => Access::ROLES]);
        config(['modules.unique_roles.bantuan' => ['approver']]);
        config(['backup.extra_roots.bantuan' => rtrim(config('filesystems.disks.local.root'), '/\\').'/bantuan']);
    }

    public function boot(): void
    {
        config(['modules.account_management.bantuan' => ['roles' => [], 'links' => [['label' => 'Kelola tim & peran Bantuan', 'href' => '/admin/bantuan/tim']]]]);
        Route::middleware(['api', 'auth:sanctum', 'user.active', 'module.access:bantuan'])->prefix('api/v1/bantuan')->group(__DIR__.'/../routes/api.php');
        if ($this->app->runningInConsole()) {
            Artisan::command('bantuan:remind', function () {
                $this->info(app(Reminders::class)->send().' tugas diperiksa.');
            })->purpose('Kirim pengingat internal tugas bantuan yang melewati tenggat');
            Schedule::command('bantuan:remind')->dailyAt('08:00')->timezone('Asia/Jakarta')->withoutOverlapping();
        }
    }
}
