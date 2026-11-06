<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class IpaymuService
{
    public function enqueueReconciliation(PaymentTransaction $row): void
    {
        if ($row->status !== 'pending' || ! in_array($row->gateway, ['ipaymu', 'ipaymu_sandbox'], true) || $row->gateway !== config('payment.gateway') || ! $row->gatewaySessionId) return;
        $key = 'ipaymu-reconcile:'.$row->id;
        if (! \Illuminate\Support\Facades\Cache::add($key, true, 60)) return;
        try {
            \App\Modules\Payment\Jobs\ReconcileIpaymuTransaction::dispatch($row->id);
        } catch (\Throwable $error) {
            \Illuminate\Support\Facades\Cache::forget($key);
            report($error);
        }
    }

    private function discoverTransactionId(PaymentTransaction $row): ?string
    {
        if (! $row->gatewayReferenceId || ! $row->gatewaySessionId) return null;
        // Bounded recent-history lookup; the detail endpoint still verifies all fields afterward.
        for ($page = 1; $page <= 5; $page++) {
            $body = $this->request('/history', [
                'account' => $this->configuration()['va'], 'date' => 'created_at',
                'startdate' => $row->createdAt->setTimezone('Asia/Jakarta')->format('Y-m-d'),
                'enddate' => now('Asia/Jakarta')->format('Y-m-d'),
                'orderBy' => 'id', 'order' => 'DESC', 'limit' => 20, 'page' => $page,
            ], 5)->throw()->json();
            abort_unless(($body['Status'] ?? null) === 200, 502, 'Riwayat iPaymu belum dapat diperiksa.');
            $data = $body['Data'] ?? [];
            $items = $data['Transaction'] ?? $data['Results'] ?? [];
            abort_unless(is_array($items), 502, 'Format riwayat iPaymu tidak valid.');
            $matches = array_values(array_filter($items, fn ($item) => is_array($item) && (string) ($item['ReferenceId'] ?? '') === $row->gatewayReferenceId));
            abort_if(count($matches) > 1, 409, 'Referensi iPaymu ganda; perlu pemeriksaan admin.');
            if ($matches) return (string) ($matches[0]['TransactionId'] ?? '');
            $pages = (int) ($data['Pagination']['total_pages'] ?? $data['Total_Page'] ?? 1);
            if ($page >= $pages || ! $items) break;
        }
        return null;
    }

    public function configuration(): array
    {
        $gateway = config('payment.gateway');
        $sandbox = $gateway === 'ipaymu_sandbox';
        $apiKey = config('payment.ipaymu.api_key');
        $va = config('payment.ipaymu.va');
        $baseUrl = rtrim((string) config('payment.ipaymu.base_url'), '/');
        $publicUrl = $this->safeOrigin(config('payment.public_url'), $sandbox);
        $apiUrl = $this->safeOrigin(config('payment.api_url'), $sandbox);
        $parsed = parse_url($baseUrl);
        abort_unless(
            in_array($gateway, ['ipaymu', 'ipaymu_sandbox'], true)
            && is_string($apiKey) && $apiKey !== '' && is_string($va) && preg_match('/^[A-Za-z0-9]+$/D', $va)
            && $parsed && ($parsed['scheme'] ?? '') === 'https'
            && ($parsed['host'] ?? '') === ($sandbox ? 'sandbox.ipaymu.com' : 'my.ipaymu.com')
            && ($parsed['path'] ?? '') === '/api/v2' && ! isset($parsed['user']) && ! isset($parsed['pass']),
            503,
            'Konfigurasi iPaymu belum lengkap atau tidak sesuai mode.'
        );

        return compact('gateway', 'sandbox', 'apiKey', 'va', 'baseUrl', 'publicUrl', 'apiUrl');
    }

    private function safeOrigin(mixed $origin, bool $allowLocal): string
    {
        $url = is_string($origin) ? parse_url($origin) : false;
        abort_unless($url && ! isset($url['user']) && ! isset($url['pass']) && isset($url['host']) && (($url['scheme'] ?? '') === 'https' || ($allowLocal && ($url['scheme'] ?? '') === 'http' && in_array($url['host'], ['localhost', '127.0.0.1'], true))), 503, 'URL publik pembayaran tidak valid.');

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

        if (config('payment.gateway') === 'ipaymu_sandbox') {
            return ($host === 'sandbox.ipaymu.com' && str_starts_with($path, '/payment/'))
                || ($host === 'sandbox-payment.ipaymu.com' && $path === '/');
        }

        return config('payment.gateway') === 'ipaymu'
            && $host === 'my.ipaymu.com'
            && str_starts_with($path, '/payment/');
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
        $row = PaymentTransaction::where('gateway', $this->configuration()['gateway'])->where('gateway_reference_id', $reference)->firstOrFail();
        $config = $this->configuration();
        abort_unless($row->gatewayAccountId === $config['va'], 422, 'Akun iPaymu tidak sesuai.');
        if (isset($payload['merchant'])) {
            abort_unless((string) $payload['merchant'] === $config['va'], 422, 'Akun callback iPaymu tidak sesuai.');
        }
        abort_unless($this->sameAmount($payload['sub_total'] ?? $payload['amount'] ?? null, $row->amount + $row->adminFee), 422, 'Nominal callback iPaymu tidak sesuai.');
        if ($row->gatewaySessionId && isset($payload['sid'])) {
            abort_unless(hash_equals($row->gatewaySessionId, (string) $payload['sid']), 422, 'Sesi iPaymu tidak sesuai.');
        }
        abort_unless(isset($payload['trx_id']) && preg_match('/^[1-9][0-9]*$/D', (string) $payload['trx_id']), 422, 'ID transaksi callback tidak valid.');
        // A signed callback is a hint; verify authoritative transaction details before persisting.
        return $this->sync($row, (string) $payload['trx_id']);
    }

    public function sync(PaymentTransaction $row, ?string $candidateId = null): PaymentTransaction
    {
        $config = $this->configuration();
        abort_unless($row->gateway === $config['gateway'], 409);
        abort_unless($row->gatewayAccountId === $config['va'], 409, 'Akun transaksi berbeda dari konfigurasi iPaymu saat ini.');
        $transactionId = $candidateId ?? $row->gatewayTransactionId ?? $this->discoverTransactionId($row);
        abort_unless(is_string($transactionId) && preg_match('/^[1-9][0-9]*$/D', $transactionId), 409, 'ID iPaymu belum diterima. Callback belum masuk; hubungi admin untuk rekonsiliasi.');
        if ($row->gatewayTransactionId) {
            abort_unless(hash_equals($row->gatewayTransactionId, $transactionId), 422, 'ID transaksi iPaymu berbeda dari yang tersimpan.');
        }
        $data = $this->request('/transaction', ['transactionId' => $transactionId])->throw()->json();
        $transaction = $data['Data'] ?? null;
        abort_unless(($data['Status'] ?? null) === 200 && is_array($transaction), 502, 'Respons status iPaymu tidak valid.');
        abort_unless((string) ($transaction['TransactionId'] ?? '') === $transactionId, 422, 'ID transaksi iPaymu tidak sesuai.');
        abort_unless(filled($row->gatewayReferenceId) && (string) ($transaction['ReferenceId'] ?? '') === $row->gatewayReferenceId, 422, 'Referensi transaksi iPaymu tidak sesuai.');
        if ($row->gatewaySessionId) {
            abort_unless(hash_equals($row->gatewaySessionId, (string) ($transaction['SessionId'] ?? '')), 422, 'Sesi transaksi iPaymu tidak sesuai.');
        }
        abort_unless($this->sameAmount($transaction['SubTotal'] ?? $transaction['Amount'] ?? null, $row->amount + $row->adminFee), 422, 'Subtotal transaksi iPaymu tidak sesuai.');
        $status = (int) ($transaction['Status'] ?? 0);
        $state = match ($status) { 1 => 'settled', 6 => 'unsettled', 7 => 'escrow', -2 => 'expired', 2, 3, 4, 5 => 'failed', default => 'ready' };
        abort_if(in_array($status, [1, 6, 7], true) && ($transaction['PaidStatus'] ?? null) !== 'paid', 422, 'Status pembayaran iPaymu tidak konsisten.');
        $row->forceFill(['gatewayTransactionId' => $transactionId, 'gatewayState' => $state])->save();
        // Escrow remains excluded from spendable paid totals until the provider releases it.
        if ($status === 7) {
            return $row->refresh();
        }
        if (in_array($status, [1, 6], true)) {
            return app(TransactionService::class)->finalize($row->id, 'paid');
        }
        if (in_array($status, [-2, 2, 3, 4, 5], true)) {
            return app(TransactionService::class)->finalize($row->id, 'failed');
        }

        return $row->refresh();
    }

    private function request(string $path, array $payload, int $timeout = 20): Response
    {
        $config = $this->configuration();
        $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $bodyHash = hash('sha256', $body);
        $signature = hash_hmac('sha256', 'POST:'.$config['va'].':'.$bodyHash.':'.$config['apiKey'], $config['apiKey']);

        return Http::connectTimeout(3)->timeout($timeout)->acceptJson()->withHeaders([
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
