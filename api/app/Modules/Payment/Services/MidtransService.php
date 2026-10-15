<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Support\Facades\Http;

class MidtransService
{
    public function configuration(): array
    {
        $key = config('payment.midtrans.server_key');
        $merchant = config('payment.midtrans.merchant_id');
        $origin = config('payment.public_url');
        $url = parse_url($origin);
        abort_unless(is_string($key) && str_starts_with($key, 'SB-Mid-server-') && $merchant && $url && ! isset($url['user']) && ! isset($url['pass']) && isset($url['host']) && (($url['scheme'] ?? '') === 'https' || (($url['scheme'] ?? '') === 'http' && in_array($url['host'], ['localhost', '127.0.0.1'], true))), 503, 'Konfigurasi Midtrans sandbox belum lengkap.');

        return ['key' => $key, 'merchant' => $merchant, 'origin' => ($url['scheme']).'://'.$url['host'].(isset($url['port']) ? ':'.$url['port'] : '')];
    }

    public function safeUrl(?string $url): bool
    {
        $parsed = $url ? parse_url($url) : false;

        return $parsed && ($parsed['scheme'] ?? '') === 'https' && ($parsed['host'] ?? '') === 'app.sandbox.midtrans.com' && ! isset($parsed['user']) && ! isset($parsed['pass']) && str_starts_with($parsed['path'] ?? '', '/snap/');
    }

    public function createSession(PaymentTransaction $row): string
    {
        $config = $this->configuration();
        abort_unless($row->midtransOrderId && $row->gatewayMerchantId === $config['merchant'], 409);
        $response = Http::timeout(20)->withBasicAuth($config['key'], '')->acceptJson()->post('https://app.sandbox.midtrans.com/snap/v1/transactions', [
            'transaction_details' => ['order_id' => $row->midtransOrderId, 'gross_amount' => $row->amount + $row->adminFee],
            'credit_card' => ['secure' => true], 'callbacks' => ['finish' => $config['origin'].'/payment/checkout/'.$row->id],
        ]);
        $data = $response->throw()->json();
        if (! is_string($data['token'] ?? null) || ! $this->safeUrl($data['redirect_url'] ?? null)) {
            throw new \RuntimeException('Invalid checkout response.');
        }

        return $data['redirect_url'];
    }

    public function verifySignature(array $payload): bool
    {
        foreach (['order_id', 'status_code', 'gross_amount', 'signature_key'] as $key) {
            if (! is_string($payload[$key] ?? null)) {
                return false;
            }
        }
        if (! preg_match('/^[a-f0-9]{128}$/iD', $payload['signature_key'])) {
            return false;
        }
        $config = $this->configuration();

        return hash_equals(hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].$config['key']), strtolower($payload['signature_key']));
    }

    public function sync(string $orderId): void
    {
        $config = $this->configuration();
        $row = PaymentTransaction::where('midtrans_order_id', $orderId)->where('gateway', 'midtrans_sandbox')->firstOrFail();
        abort_unless($row->gatewayMerchantId === $config['merchant'], 409);
        $response = Http::timeout(10)->withBasicAuth($config['key'], '')->acceptJson()->get('https://api.sandbox.midtrans.com/v2/'.rawurlencode($orderId).'/status');
        if ($response->status() === 404) {
            return;
        }
        $data = $response->throw()->json();
        if (($data['status_code'] ?? null) === '404') {
            return;
        }
        if (($data['order_id'] ?? null) !== $orderId || ($data['merchant_id'] ?? null) !== $row->gatewayMerchantId || ($data['currency'] ?? null) !== 'IDR' || ! is_string($data['gross_amount'] ?? null) || ! preg_match('/^\d+(\.0+)?$/D', $data['gross_amount']) || (float) $data['gross_amount'] !== (float) ($row->amount + $row->adminFee)) {
            throw new \RuntimeException('Gateway payment does not match the transaction.');
        }
        $status = $data['transaction_status'] ?? null;
        if ($status === 'settlement' || ($status === 'capture' && ($data['fraud_status'] ?? null) === 'accept')) {
            app(TransactionService::class)->finalize($row->id, 'paid');
        } elseif (in_array($status, ['expire', 'cancel', 'deny', 'failure'], true)) {
            app(TransactionService::class)->finalize($row->id, 'failed');
        }
    }
}
