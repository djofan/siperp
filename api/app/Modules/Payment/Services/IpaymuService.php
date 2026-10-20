<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class IpaymuService
{
    public function configuration(): array
    {
        $apiKey = config('payment.ipaymu.api_key');
        $va = config('payment.ipaymu.va');
        $baseUrl = rtrim((string) config('payment.ipaymu.base_url'), '/');
        $publicUrl = $this->safeOrigin(config('payment.public_url'));
        $apiUrl = $this->safeOrigin(config('payment.api_url'));
        $parsed = parse_url($baseUrl);
        abort_unless(
            is_string($apiKey) && $apiKey !== '' && is_string($va) && preg_match('/^[A-Za-z0-9]+$/D', $va)
            && $parsed && ($parsed['scheme'] ?? '') === 'https' && ($parsed['host'] ?? '') === 'sandbox.ipaymu.com'
            && ($parsed['path'] ?? '') === '/api/v2' && ! isset($parsed['user']) && ! isset($parsed['pass']),
            503,
            'Konfigurasi iPaymu sandbox belum lengkap.'
        );

        return compact('apiKey', 'va', 'baseUrl', 'publicUrl', 'apiUrl');
    }

    private function safeOrigin(mixed $origin): string
    {
        $url = is_string($origin) ? parse_url($origin) : false;
        abort_unless($url && ! isset($url['user']) && ! isset($url['pass']) && isset($url['host']) && (($url['scheme'] ?? '') === 'https' || (($url['scheme'] ?? '') === 'http' && in_array($url['host'], ['localhost', '127.0.0.1'], true))), 503, 'URL publik pembayaran tidak valid.');

        return $url['scheme'].'://'.$url['host'].(isset($url['port']) ? ':'.$url['port'] : '').rtrim($url['path'] ?? '', '/');
    }

    public function safeUrl(?string $url): bool
    {
        $parsed = $url ? parse_url($url) : false;

        if (! $parsed || ($parsed['scheme'] ?? '') !== 'https' || isset($parsed['user']) || isset($parsed['pass'])) {
            return false;
        }

        $host = strtolower($parsed['host'] ?? '');
        $path = $parsed['path'] ?? '';

        return ($host === 'sandbox.ipaymu.com' && str_starts_with($path, '/payment/'))
            || ($host === 'sandbox-payment.ipaymu.com' && $path === '/');
    }

    public function createSession(PaymentTransaction $row): array
    {
        $config = $this->configuration();
        abort_unless($row->gatewayReferenceId && $row->gatewayAccountId === $config['va'], 409);
        $row->loadMissing('donor');
        $label = $row->sourceType === 'zakat' ? 'Zakat LAZSIP' : ($row->moduleSource === 'sarsip' ? 'Donasi SARSIP' : 'Donasi LAZSIP');
        $payload = [
            'product' => [$label],
            'qty' => [1],
            'price' => [$row->amount + $row->adminFee],
            'description' => ['Transaksi '.$row->trackingCode],
            'returnUrl' => $config['publicUrl'].'/payment/checkout/'.$row->id,
            'notifyUrl' => $config['apiUrl'].'/payment/webhook/ipaymu',
            'cancelUrl' => $config['publicUrl'].'/payment/checkout/'.$row->id,
            'referenceId' => $row->gatewayReferenceId,
            'buyerName' => $row->donor->name,
            'expired' => 24,
        ];
        if ($row->donor->email) {
            $payload['buyerEmail'] = $row->donor->email;
        }
        if ($row->donor->phone) {
            $payload['buyerPhone'] = $row->donor->phone;
        }
        $data = $this->request('/payment', $payload)->throw()->json();
        $sessionId = $data['Data']['SessionID'] ?? null;
        $url = $data['Data']['Url'] ?? null;
        if (($data['Status'] ?? null) !== 200 || ! is_string($sessionId) || $sessionId === '' || ! is_string($url) || ! $this->safeUrl($url)) {
            throw new \RuntimeException('Invalid iPaymu checkout response.');
        }

        return ['sessionId' => $sessionId, 'url' => $url];
    }

    public function verifyCallback(array $payload, ?string $signature): bool
    {
        if (! is_string($signature) || ! preg_match('/^[a-f0-9]{64}$/iD', $signature)) {
            return false;
        }
        $normalized = $this->normalizeCallback($payload);
        $va = $this->configuration()['va'];

        return hash_equals(hash_hmac('sha256', json_encode($normalized, JSON_THROW_ON_ERROR), $va), strtolower($signature));
    }

    public function handleCallback(array $payload): PaymentTransaction
    {
        $reference = $payload['reference_id'] ?? $payload['referenceId'] ?? null;
        abort_unless(is_string($reference) && $reference !== '', 422, 'Referensi transaksi iPaymu tidak tersedia.');
        $row = PaymentTransaction::where('gateway', 'ipaymu_sandbox')->where('gateway_reference_id', $reference)->firstOrFail();
        $config = $this->configuration();
        abort_unless(($payload['merchant'] ?? null) === $config['va'], 422, 'Akun iPaymu tidak sesuai.');
        abort_unless($this->sameAmount($payload['amount'] ?? null, $row->amount + $row->adminFee), 422, 'Nominal callback iPaymu tidak sesuai.');
        if ($row->gatewaySessionId && isset($payload['sid'])) {
            abort_unless(hash_equals($row->gatewaySessionId, (string) $payload['sid']), 422, 'Sesi iPaymu tidak sesuai.');
        }
        $row->forceFill([
            'gatewaySessionId' => isset($payload['sid']) ? (string) $payload['sid'] : $row->gatewaySessionId,
            'gatewayTransactionId' => isset($payload['trx_id']) ? (string) $payload['trx_id'] : $row->gatewayTransactionId,
        ])->save();
        $status = (int) ($payload['transaction_status_code'] ?? $payload['status_code'] ?? 0);
        if (in_array($status, [1, 6], true)) {
            return app(TransactionService::class)->finalize($row->id, 'paid');
        }
        if (in_array($status, [-2, 2, 3, 4, 5], true)) {
            return app(TransactionService::class)->finalize($row->id, 'failed');
        }

        return $row->refresh();
    }

    public function sync(PaymentTransaction $row): PaymentTransaction
    {
        abort_unless($row->gateway === 'ipaymu_sandbox', 409);
        if (! $row->gatewayTransactionId) {
            return $row;
        }
        $data = $this->request('/transaction', ['transactionId' => $row->gatewayTransactionId])->throw()->json();
        $transaction = $data['Data'] ?? null;
        abort_unless(($data['Status'] ?? null) === 200 && is_array($transaction), 502, 'Respons status iPaymu tidak valid.');
        abort_unless((string) ($transaction['TransactionId'] ?? '') === $row->gatewayTransactionId, 422, 'ID transaksi iPaymu tidak sesuai.');
        if (isset($transaction['ReferenceId'])) {
            abort_unless((string) $transaction['ReferenceId'] === $row->gatewayReferenceId, 422, 'Referensi transaksi iPaymu tidak sesuai.');
        }
        abort_unless($this->sameAmount($transaction['Amount'] ?? null, $row->amount + $row->adminFee), 422, 'Nominal transaksi iPaymu tidak sesuai.');
        $status = (int) ($transaction['Status'] ?? 0);
        if (in_array($status, [1, 6], true)) {
            return app(TransactionService::class)->finalize($row->id, 'paid');
        }
        if (in_array($status, [-2, 2, 3, 4, 5], true)) {
            return app(TransactionService::class)->finalize($row->id, 'failed');
        }

        return $row->refresh();
    }

    private function request(string $path, array $payload): Response
    {
        $config = $this->configuration();
        $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $bodyHash = hash('sha256', $body);
        $signature = hash_hmac('sha256', 'POST:'.$config['va'].':'.$bodyHash.':'.$config['apiKey'], $config['apiKey']);

        return Http::timeout(20)->acceptJson()->withHeaders([
            'va' => $config['va'],
            'signature' => $signature,
            'timestamp' => now('Asia/Jakarta')->format('YmdHis'),
        ])->withBody($body, 'application/json')->send('POST', $config['baseUrl'].$path);
    }

    private function normalizeCallback(array $payload): array
    {
        unset($payload['signature']);
        $normalized = [];
        foreach ($payload as $key => $value) {
            if (in_array($key, ['trx_id', 'status_code', 'transaction_status_code', 'paid_off'], true)) {
                $normalized[$key] = (int) $value;
            } elseif ($key === 'is_escrow') {
                $normalized[$key] = in_array($value, [true, 1, '1', 'true'], true);
            } elseif ($key === 'additional_info' && $value === '[]') {
                $normalized[$key] = [];
            } elseif ($key === 'additional_info') {
                $normalized[$key] = $value;
            } else {
                $normalized[$key] = $value === null ? 'null' : (string) $value;
            }
        }
        $normalized['additional_info'] ??= [];
        ksort($normalized, SORT_STRING);

        return $normalized;
    }

    private function sameAmount(mixed $value, int $expected): bool
    {
        return (is_string($value) || is_int($value) || is_float($value))
            && preg_match('/^\d+(?:\.0+)?$/D', (string) $value)
            && (float) $value === (float) $expected;
    }
}
