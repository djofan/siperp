<?php

namespace App\Modules\Payment\Jobs;

use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessIpaymuCallback implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout;

    public function __construct(public array $payload)
    {
        $this->timeout = (int) config('payment.ipaymu.sync_timeout', 180) + 30;
        $this->onConnection('payment')->onQueue('callbacks');
    }

    public function backoff(): array
    {
        return [10, 30, 60, 120];
    }

    public function handle(IpaymuService $gateway): void
    {
        $gateway->handleCallback($this->payload);
    }

    public function failed(?\Throwable $error): void
    {
        Log::error('iPaymu callback reconciliation exhausted retries. Review payment queue.', ['exception_type' => $error ? get_class($error) : null]);
    }
}
