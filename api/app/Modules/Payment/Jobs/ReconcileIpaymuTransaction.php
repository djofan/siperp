<?php

namespace App\Modules\Payment\Jobs;

use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ReconcileIpaymuTransaction implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout;

    public function __construct(public string $transactionId)
    {
        $this->timeout = (int) config('payment.ipaymu.sync_timeout', 180) + 30;
        $this->onConnection('payment')->onQueue('callbacks');
    }

    public function backoff(): array
    {
        return [30, 60];
    }

    public function handle(IpaymuService $gateway): void
    {
        $row = PaymentTransaction::find($this->transactionId);
        if ($row && $row->status === 'pending' && in_array($row->gateway, ['ipaymu', 'ipaymu_sandbox'], true) && $row->gateway === config('payment.gateway')) {
            $gateway->sync($row);
        }
    }
}
