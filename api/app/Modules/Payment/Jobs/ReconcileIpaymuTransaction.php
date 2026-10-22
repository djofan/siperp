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
    public int $timeout = 55;

    public function __construct(public string $transactionId)
    {
        $this->onConnection('payment')->onQueue('callbacks');
    }

    public function backoff(): array { return [30, 60]; }

    public function handle(IpaymuService $gateway): void
    {
        $row = PaymentTransaction::find($this->transactionId);
        if ($row && $row->status === 'pending' && $row->gateway === 'ipaymu_sandbox') {
            $gateway->sync($row);
        }
    }
}
