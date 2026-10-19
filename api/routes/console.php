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
    $rows = PaymentTransaction::where('gateway', 'ipaymu_sandbox')->where('status', 'pending')->whereNotNull('gateway_transaction_id')->orderBy('created_at')->limit(50)->get();
    foreach ($rows as $row) {
        try {
            app(IpaymuService::class)->sync($row);
        } catch (Throwable) {
            $this->warn('Gateway sync deferred for '.$row->id);
        }
    }
})->purpose('Refresh pending sandbox payments from the trusted gateway');

Schedule::command('payment:sync-pending')->everyMinute()->withoutOverlapping();
Schedule::command('payment:receipts-retry')->everyMinute()->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
