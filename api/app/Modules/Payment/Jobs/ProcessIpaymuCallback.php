<?php

namespace App\Modules\Payment\Jobs;

use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessIpaymuCallback implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;
    public int $timeout = 40;

    public function __construct(public array $payload)
    {
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
        \Illuminate\Support\Facades\Log::error('iPaymu callback reconciliation exhausted retries. Review payment queue.', ['exception_type' => $error ? get_class($error) : null]);
    }
}
