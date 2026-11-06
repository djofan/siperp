<?php

namespace App\Modules\Payment\Jobs;

use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\ReceiptService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DeliverPaymentEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 25;

    public function __construct(public string $transactionId, public bool $tracking = false)
    {
        $this->onConnection('payment')->onQueue('receipts');
    }

    public function backoff(): array { return [30, 120]; }

    public function handle(ReceiptService $receipts): void
    {
        if ($this->tracking) {
            $receipts->tracking(PaymentTransaction::findOrFail($this->transactionId));
        } else {
            $receipts->deliver($this->transactionId);
        }
    }
}
