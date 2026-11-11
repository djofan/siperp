<?php

use App\Modules\Core\Services\BackupService;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use App\Modules\Payment\Services\ReceiptService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('erp:backup {operation=create} {id?} {--confirm-empty-target} {--files-dir=}', function () {
    $service = app(BackupService::class);
    $operation = $this->argument('operation');
    $result = match ($operation) {
        'create' => $service->create(), 'list' => $service->list(), 'verify' => $service->verify($this->argument('id') ?? ''),
        'restore' => $this->option('confirm-empty-target') && $this->option('files-dir') && config('backup.restore_database_url')
            ? $service->restore($this->argument('id') ?? '', config('backup.restore_database_url'), $this->option('files-dir'))
            : throw new RuntimeException('Pemulihan memerlukan ERP_RESTORE_DATABASE_URL, --confirm-empty-target dan --files-dir.'),
        default => throw new RuntimeException('Operasi backup tidak valid.'),
    };
    $this->line(json_encode($result, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
})->purpose('Create, inspect or restore encrypted ERP backups on an empty target');

Artisan::command('payment:receipts-retry', function (): void {
    $count = app(ReceiptService::class)->retry();
    $this->info("Processed {$count} queued receipts.");
})->purpose('Retry queued payment receipts with their original idempotency key');

Artisan::command('payment:sync-pending', function (): void {
    $gateway = config('payment.gateway');
    $rows = in_array($gateway, ['ipaymu', 'ipaymu_sandbox'], true)
        ? PaymentTransaction::where('gateway', $gateway)->where('status', 'pending')->whereNotNull('gateway_session_id')->orderBy('created_at')->limit(50)->get()
        : collect();
    foreach ($rows as $row) {
        try {
            app(IpaymuService::class)->enqueueReconciliation($row);
        } catch (Throwable) {
            $this->warn('Gateway sync deferred for '.$row->id);
        }
    }
})->purpose('Refresh pending iPaymu payments from the trusted gateway');

Schedule::command('payment:sync-pending')->everyMinute()->withoutOverlapping();
Schedule::command('payment:receipts-retry')->everyMinute()->withoutOverlapping();

Artisan::command('payment:ipaymu-check {--remote : Test authentication with the read-only balance endpoint}', function (): int {
    $service = app(IpaymuService::class);
    try {
        $config = $service->configuration();
    } catch (Throwable) {
        $this->error('IPAYMU_CONFIGURATION_INVALID: periksa mode, VA/API key, endpoint, dan URL publik HTTPS.');

        return 1;
    }
    $this->table(['Pemeriksaan', 'Hasil'], [
        ['Mode', $config['gateway']], ['Endpoint', $config['baseUrl']],
        ['Cache konfigurasi', app()->configurationIsCached() ? 'Aktif' : 'Tidak aktif'],
        ['Spasi tepi kredensial dinormalisasi', config('payment.ipaymu.api_key') !== $config['apiKey'] || config('payment.ipaymu.va') !== $config['va'] ? 'Ya; rapikan nilai di environment server' : 'Tidak diperlukan'],
        ['Waktu server', now('Asia/Jakarta')->format('Y-m-d H:i:s P')],
    ]);
    if (! $this->option('remote')) {
        $this->info('Konfigurasi lokal valid. Gunakan --remote untuk memeriksa penerimaan signature oleh iPaymu tanpa membuat pembayaran.');

        return 0;
    }
    try {
        $result = $service->checkConnection();
        $this->line($result['code'].' | HTTP '.$result['httpStatus'].' | status provider '.($result['providerStatus'] ?? 'tidak tersedia'));
        if ($result['ok']) {
            $this->info('Signature dan kredensial diterima untuk cek koneksi. Tidak ada pembayaran dibuat. Persetujuan domain dan verifikasi merchant tetap diperiksa terpisah.');

            return 0;
        }
        $this->warn('Cocokkan VA/API key dengan mode dashboard, jalankan config:cache setelah perubahan, dan kirim kode hasil ini ke tim teknis.');

        return 1;
    } catch (Throwable) {
        $this->error('IPAYMU_CONNECTION_FAILED: server belum dapat menyelesaikan pemeriksaan. Periksa DNS, HTTPS, waktu server, dan koneksi outbound.');

        return 1;
    }
})->purpose('Check iPaymu configuration and optionally authenticate without creating a payment or displaying credentials');

Artisan::command('payment:ipaymu-unicode-check {--remote : Send three read-only balance probes}', function (): int {
    $this->line('Membandingkan kontrol, Unicode escaped dan UTF-8 melalui POST /balance. Tidak membuat pembayaran.');
    $this->warn('Kolom description pada probe Unicode bukan parameter balance yang dijamin didukung. Penolakan dapat membuat hasil belum konklusif.');
    if (! $this->option('remote')) {
        $this->info('Belum ada request dikirim. Gunakan --remote untuk menjalankan tiga probe berurutan; setiap probe dapat memerlukan 90 detik sesuai konfigurasi.');

        return 0;
    }
    try {
        $allOk = true;
        foreach (app(IpaymuService::class)->probeUnicodeSerialization() as $result) {
            $this->line($result['variant'].' | '.$result['code'].' | HTTP '.($result['httpStatus'] ?? '-')
                .' | provider '.($result['providerStatus'] ?? '-').' | '.$result['durationMs'].' ms');
            $allOk = $allOk && $result['ok'];
        }
        $this->warn('Hasil balance tidak membuktikan penerimaan checkout. Perbedaan hasil hanya petunjuk; timeout atau penolakan kolom tambahan bukan bukti kesalahan Unicode. Saldo dan kredensial tidak ditampilkan.');

        return $allOk ? 0 : 1;
    } catch (Throwable) {
        $this->error('IPAYMU_PROBE_FAILED: periksa konfigurasi dan log diagnosis transport. Tidak ada pembayaran dibuat.');

        return 1;
    }
})->purpose('Compare Unicode JSON encodings on balance without creating payments or displaying financial data');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
