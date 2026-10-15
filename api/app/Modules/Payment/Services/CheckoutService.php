<?php

namespace App\Modules\Payment\Services;

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipPaymentFeeRef;
use App\Modules\Lazsip\Models\LazsipZakatDetail;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Sarsip\Models\SarsipEntry;
use App\Modules\Sarsip\Models\SarsipPaymentMethod;
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
        if ($input['moduleSource'] === 'sarsip' && ! $phone) {
            throw ValidationException::withMessages(['donorPhone' => 'Masukkan nomor WhatsApp yang valid.']);
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
        $source = $input['sourceType'];
        $fund = $module === 'sarsip' ? 'donasi' : ($source === 'zakat' ? 'zakat' : 'infak');
        abort_unless($input['fundType'] === $fund && ($source === 'campaign' || ($source === 'zakat' && $module === 'lazsip')), 422);
        $method = config('payment.gateway') === 'midtrans_sandbox'
            ? ($input['paymentMethod'] === 'Midtrans Sandbox' ? (object) ['method' => 'Midtrans Sandbox', 'feeAmount' => 0, 'feePercentage' => 0] : null)
            : ($module === 'sarsip' ? SarsipPaymentMethod::where('method', $input['paymentMethod'])->first() : LazsipPaymentFeeRef::where('method', $input['paymentMethod'])->first());
        abort_unless($method, 422, 'Metode pembayaran tidak tersedia.');
        $amount = $input['amount'];
        if ($source === 'campaign') {
            $campaign = $module === 'sarsip' ? SarsipEntry::where('kind', 'campaign')->where('status', 'published')->lockForUpdate()->find($input['sourceId']) : LazsipCampaign::where('status', 'active')->lockForUpdate()->find($input['sourceId']);
            abort_unless($campaign, 404, 'Campaign tidak ditemukan atau sudah selesai.');
            if ($module === 'lazsip') {
                abort_unless(preg_match('/^\d{2}$/D', $campaign->uniqueCode), 503);
                $amount = (int) (ceil($amount / 100) * 100 + (int) $campaign->uniqueCode);
            }
        }
        $fee = $input['coversFee'] ? (int) ($method->feeAmount ?? 0) + (int) round($amount * (($method->feePercentage ?? 0) / 100)) : 0;
        abort_unless($fee >= 0 && $amount + $fee <= 2147483647, 422, 'Total pembayaran tidak valid.');
        $donor = $this->donors->resolve($input['donorName'], $input['donorPhone'], $input['donorEmail']);
        $sourceId = $input['sourceId'] ?? null;
        if ($source === 'zakat') {
            $detail = new LazsipZakatDetail;
            $detail->forceFill(['zakatType' => $input['zakatType'], 'goldPriceSnapshot' => $input['zakatType'] === 'maal' ? ($input['goldPriceSnapshot'] ?? 0) : null, 'jiwaCount' => $input['zakatType'] === 'fitrah' ? ($input['jiwaCount'] ?? null) : null])->save();
            $sourceId = $detail->id;
        }
        $row = $this->transactions->create(['moduleSource' => $module, 'sourceType' => $source, 'sourceId' => $sourceId, 'fundType' => $fund, 'donorId' => $donor->id, 'isAnonymous' => $input['isAnonymous'], 'amount' => $amount, 'adminFee' => $fee, 'paymentMethod' => $method->method]);
        if ($source === 'zakat' && $row->sourceId !== $sourceId) {
            $detail->delete();
        }

        return $row;
    }
}
