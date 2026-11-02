<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(private DonorService $donors, private TransactionService $transactions) {}

    public function create(array $input, string $key): PaymentTransaction
    {
        $phoneRaw = trim($input['donorPhone'] ?? '');
        $emailRaw = trim($input['donorEmail'] ?? '');
        $phone = $phoneRaw ? $this->donors->normalizePhone($phoneRaw) : null;
        $email = $emailRaw ? $this->donors->normalizeEmail($emailRaw) : null;
        if ($phoneRaw && ! $phone) {
            throw ValidationException::withMessages(['donorPhone' => 'Nomor WhatsApp tidak valid.']);
        }
        if ($emailRaw && ! $email) {
            throw ValidationException::withMessages(['donorEmail' => 'Alamat email tidak valid.']);
        }
        if (! $phone && ! $email) {
            throw ValidationException::withMessages(['donorEmail' => 'Isi minimal salah satu: nomor WhatsApp atau email.']);
        }
        $input['donorPhone'] = $phone;
        $input['donorEmail'] = $email;
        $input['donorName'] = trim($input['donorName']);
        $input['coversFee'] ??= true;
        $input['isAnonymous'] ??= false;
        ksort($input);
        $fingerprint = hash('sha256', json_encode($input, JSON_THROW_ON_ERROR));
        $scope = hash_hmac('sha256', $input['moduleSource'].'|'.$input['sourceType'].'|'.($phone ?? $email), config('app.key'));
        $keyHash = hash('sha256', $key);
        for ($attempt = 0; $attempt < 6; $attempt++) {
            try {
                return DB::transaction(function () use ($input, $scope, $keyHash, $fingerprint): PaymentTransaction {
                    $existing = DB::table('payment_idempotency')->where('scope', $scope)->where('key_hash', $keyHash)->lockForUpdate()->first();
                    if ($existing) {
                        abort_unless(hash_equals($existing->fingerprint, $fingerprint), 409, 'Key idempotensi sudah dipakai untuk data yang berbeda.');

                        return PaymentTransaction::findOrFail($existing->transaction_id);
                    }
                    DB::table('payment_idempotency')->insert(['scope' => $scope, 'key_hash' => $keyHash, 'fingerprint' => $fingerprint, 'created_at' => now(), 'updated_at' => now()]);
                    $row = $this->checkout($input);
                    DB::table('payment_idempotency')->where('scope', $scope)->where('key_hash', $keyHash)->update(['transaction_id' => $row->id, 'updated_at' => now()]);

                    return $row;
                }, 5);
            } catch (QueryException $error) {
                if ($attempt >= 5 || ! in_array((string) $error->getCode(), ['23000', '23505', '40001'], true)) {
                    throw $error;
                }
                usleep(random_int(10000, 50000));
            }
        }
        abort(503);
    }

    private function checkout(array $input): PaymentTransaction
    {
        $module = $input['moduleSource'];
        $registered = DB::table('modules')->where('slug', $module)->first();
        abort_unless($registered?->is_active, 404);
        $adapter = app(\App\Support\PaymentModules::class)->for($module);
        $prepared = $adapter->prepare($input);
        $source = $input['sourceType'];
        $fund = $prepared['fund'];
        $amount = $prepared['amount'];
        $sourceId = $prepared['sourceId'];
        $methodData = config('payment.gateway') === 'ipaymu_sandbox'
            ? ($input['paymentMethod'] === 'iPaymu Sandbox' ? ['method' => 'iPaymu Sandbox', 'feeAmount' => 0, 'feePercentage' => 0] : null)
            : $adapter->paymentMethod($input['paymentMethod']);
        abort_unless($methodData !== null, 422, 'Metode pembayaran tidak tersedia.');
        $method = (object) $methodData;
        $fee = $input['coversFee'] ? (int) ($method->feeAmount ?? 0) + (int) round($amount * (($method->feePercentage ?? 0) / 100)) : 0;
        abort_unless($fee >= 0 && $amount + $fee <= 2147483647, 422, 'Total pembayaran tidak valid.');
        $donor = $this->donors->resolve($input['donorName'], $input['donorPhone'], $input['donorEmail']);
        $row = $this->transactions->create(['moduleSource' => $module, 'sourceType' => $source, 'sourceId' => $sourceId, 'fundType' => $fund, 'donorId' => $donor->id, 'isAnonymous' => $input['isAnonymous'], 'amount' => $amount, 'adminFee' => $fee, 'paymentMethod' => $method->method]);
        if ($source === 'zakat' && $row->sourceId !== $sourceId) {
            $adapter->discardUnusedSource($source, $sourceId);
        }

        return $row;
    }
}
