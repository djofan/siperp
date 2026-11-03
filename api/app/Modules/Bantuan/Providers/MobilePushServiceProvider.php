<?php

namespace App\Modules\Bantuan\Providers;

use App\Modules\Bantuan\Http\Controllers\MobileDeviceController;
use App\Modules\Bantuan\Services\FcmClient;
use App\Modules\Bantuan\Services\MobilePush;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\ServiceProvider;

class MobilePushServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::prefix('api/v1/bantuan/mobile')->middleware(['api', 'auth:sanctum', 'user.active', 'module.access:bantuan', 'throttle:60,1'])->group(function () {
            Route::post('devices', [MobileDeviceController::class, 'store']);
            Route::delete('devices', [MobileDeviceController::class, 'destroy']);
        });
        Route::middleware(['api', 'auth:sanctum'])->delete('api/v1/bantuan/mobile/session', [MobileDeviceController::class, 'logout']);
        if ($this->app->runningInConsole()) {
            Artisan::command('bantuan:push', function () {
                try {
                    $this->info(app(MobilePush::class)->sendPending().' push dikirim.');
                } catch (\Throwable) {
                    $this->error('Pengiriman push gagal. Periksa koneksi, konfigurasi dan izin FCM.');

                    return 1;
                }
            })->purpose('Kirim notifikasi Bantuan ke perangkat mobile yang terdaftar');
            Artisan::command('bantuan:push-check', function () {
                try {
                    $response = app(FcmClient::class)->send(['topic' => 'bantuan-config-check', 'notification' => ['title' => 'Configuration check', 'body' => 'Validation only']], true);
                    if ($response->successful()) {
                        $this->info('Firebase terhubung: OAuth dan izin FCM valid. Tidak ada pesan dikirim.');

                        return 0;
                    }
                    $this->error('Validasi Firebase ditolak: HTTP '.$response->status().' / '.($response->json('error.status') ?? 'unknown'));
                } catch (\Throwable) {
                    $this->error('Tidak dapat memvalidasi Firebase. Periksa file kunci dan koneksi.');
                }

                return 1;
            })->purpose('Validasi kredensial FCM tanpa mengirim notifikasi');
            Schedule::command('bantuan:push')->everyMinute()->withoutOverlapping(30);
        }
    }
}
