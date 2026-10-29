<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Lazsip\Models\LazsipPaymentFeeRef;
use App\Modules\Lazsip\Models\LazsipSiteContent;
use App\Modules\Lazsip\Models\LazsipZakatPayment;
use App\Modules\Lazsip\Services\GoldPriceService;
use App\Modules\Payment\Models\PaymentDonor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ZakatController
{
    public function quote(GoldPriceService $gold): JsonResponse
    {
        $quote = $gold->quote();

        return response()->json(['quote' => $quote], $quote ? 200 : 503)->header('Cache-Control', 'no-store');
    }

    public function maal(Request $request, GoldPriceService $gold): JsonResponse
    {
        $data = $request->validate(['hartaAmount' => 'required|numeric|min:0|max:9007199254740991']);
        $quote = $gold->quote();
        abort_unless($quote && $quote['value'] > 0, 503, 'Harga emas belum tersedia.');
        $nisab = $quote['value'] * 85;
        $wajib = $data['hartaAmount'] >= $nisab;

        return response()->json(['goldPricePerGram' => $quote['value'], 'nisabValue' => $nisab, 'isWajibZakat' => $wajib, 'zakatAmount' => $wajib ? (int) round($data['hartaAmount'] * 0.025) : 0]);
    }

    public function fitrahPrice(): int
    {
        $row = LazsipSiteContent::where('section_key', 'zakatFitrah')->first();
        $content = $row ? json_decode($row->contentJson, true, flags: JSON_THROW_ON_ERROR) : [];
        $value = $content['pricePerJiwa'] ?? null;

        return is_numeric($value) && $value > 0 ? (int) round($value) : 45000;
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => ['fitrahPricePerJiwa' => $this->fitrahPrice()]]);
    }

    public function fitrah(Request $request): JsonResponse
    {
        $data = $request->validate(['jiwaCount' => 'required|integer|min:1|max:100000']);
        $price = $this->fitrahPrice();

        return response()->json(['pricePerJiwa' => $price, 'jiwaCount' => $data['jiwaCount'], 'totalAmount' => $price * $data['jiwaCount']]);
    }

    // Historical endpoint retained for old clients. New checkout writes PaymentTransaction.
    public function legacyStore(Request $request): JsonResponse
    {
        $data = $request->validate(['donorName' => 'sometimes|nullable|string|max:191', 'zakatType' => 'required|in:maal,fitrah', 'amount' => 'required|integer|min:1|max:2147483647', 'coversFee' => 'sometimes|boolean', 'isAnonymous' => 'sometimes|boolean', 'goldPriceSnapshot' => 'sometimes|nullable|integer|min:0|max:2147483647', 'jiwaCount' => 'sometimes|nullable|integer|min:1|max:100000', 'paymentMethod' => 'required|string|max:191']);
        $row = DB::transaction(function () use ($data): LazsipZakatPayment {
            $fee = LazsipPaymentFeeRef::where('method', $data['paymentMethod'])->first();
            abort_unless($fee !== null, 422, 'Metode pembayaran tidak tersedia.');
            $adminFee = ($data['coversFee'] ?? true) ? (int) ($fee->feeAmount ?? 0) + (int) round($data['amount'] * (($fee->feePercentage ?? 0) / 100)) : 0;
            abort_unless($data['amount'] + $adminFee <= 2147483647, 422);
            $donor = new PaymentDonor;
            $donor->forceFill(['name' => ($data['isAnonymous'] ?? false) ? 'Hamba Allah' : (trim($data['donorName'] ?? '') ?: 'Hamba Allah')])->save();
            $row = new LazsipZakatPayment;
            $row->forceFill(['donorId' => $donor->id, 'zakatType' => $data['zakatType'], 'amount' => $data['amount'], 'adminFee' => $adminFee, 'coversFee' => $data['coversFee'] ?? true, 'isAnonymous' => $data['isAnonymous'] ?? false, 'goldPriceSnapshot' => $data['zakatType'] === 'maal' ? ($data['goldPriceSnapshot'] ?? 0) : null, 'jiwaCount' => $data['zakatType'] === 'fitrah' ? ($data['jiwaCount'] ?? null) : null, 'paymentMethod' => $data['paymentMethod'], 'status' => 'pending'])->save();

            return $row;
        });

        return response()->json(['ok' => true, 'id' => $row->id], 201);
    }
}
