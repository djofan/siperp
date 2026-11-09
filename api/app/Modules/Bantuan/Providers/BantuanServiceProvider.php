<?php

namespace App\Modules\Bantuan\Providers;

use App\Modules\Bantuan\Console\WebPushKey;
use App\Modules\Bantuan\Console\WhatsappOutbox;
use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\BantuanSession;
use App\Modules\Bantuan\Services\Reminders;
use App\Modules\Bantuan\Services\WebPushKeys;
use App\Modules\Bantuan\Services\WebPushSender;
use App\Support\ModuleSessions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\ServiceProvider;

class BantuanServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(ModuleSessions::class)->register('bantuan', BantuanSession::class);
        config(['modules.roles.bantuan' => Access::ROLES]);
        config(['modules.unique_roles.bantuan' => ['approver']]);
        config(['backup.extra_roots.bantuan' => rtrim(config('filesystems.disks.local.root'), '/\\').'/bantuan']);
    }

    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/bantuan/mobile')->group(__DIR__.'/../routes/mobile.php');
        config(['modules.account_management.bantuan' => ['roles' => [], 'links' => [['label' => 'Kelola tim & peran Bantuan', 'href' => '/admin/bantuan/tim']]]]);
        Route::middleware(['api', 'auth:sanctum', 'user.active', 'module.access:bantuan'])->prefix('api/v1/bantuan')->group(__DIR__.'/../routes/api.php');
        Route::middleware(['api', 'auth:sanctum', 'user.active', 'module.access:bantuan'])->prefix('api/v1/bantuan')->group(__DIR__.'/../routes/whatsapp.php');
        if ($this->app->runningInConsole()) {
            $this->commands([WhatsappOutbox::class, WebPushKey::class]);
            Artisan::command('bantuan:web-push', function () {
                try {
                    if (! app(WebPushKeys::class)->read()) {
                        $this->error('Kunci Web Push belum tersedia. Jalankan bantuan:web-push-key saat setup server.');

                        return 1;
                    }
                    $sender = app(WebPushSender::class);
                    $this->info($sender->sendPending().' web push diterima layanan browser.');
                    if ($sender->failed) {
                        $this->warn($sender->failed.' pengiriman gagal sementara; akan dicoba lagi. Periksa koneksi dan konfigurasi VAPID.');

                        return 1;
                    }
                } catch (\Throwable) {
                    $this->error('Web Push belum dapat diproses. Periksa migration, kunci privat dan koneksi server.');

                    return 1;
                }
            })->purpose('Kirim notifikasi Bantuan ke langganan PWA aktif');
            Schedule::command('bantuan:web-push')->everyMinute()->withoutOverlapping(30);
            Schedule::command('bantuan:whatsapp')->everyMinute()->withoutOverlapping(5);
            Artisan::command('bantuan:remind', function () {
                $this->info(app(Reminders::class)->send().' tugas diperiksa.');
            })->purpose('Kirim pengingat internal tugas bantuan yang melewati tenggat');
            Schedule::command('bantuan:remind')->dailyAt('08:00')->timezone('Asia/Jakarta')->withoutOverlapping();
        }
    }
}
