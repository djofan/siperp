<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Lazsip\Models\LazsipZakatDetail;
use App\Modules\Lazsip\Models\LazsipZakatPayment;
use App\Modules\Lazsip\Services\DonorHistoryService;
use App\Modules\Lazsip\Services\HistoryOtpService;
use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\DonorService;
use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController
{
    public function publicHistory(Request $request, DonorService $donors, HistoryOtpService $otp, DonorHistoryService $history): JsonResponse
    {
        $data = $request->validate(['email' => 'required|string|max:191', 'action' => 'required|in:email,request,verify', 'challengeId' => 'required_if:action,verify|string|max:191', 'code' => 'required_if:action,verify|digits:6']);
        $email = $donors->normalizeEmail($data['email']);
        abort_unless($email !== null, 422, 'Masukkan alamat email yang valid.');
        if ($data['action'] === 'email') {
            app(\App\Modules\Lazsip\Services\HistoryEmailService::class)->send($email, $history);

            return response()->json(['message' => 'Riwayat telah dikirim ke email yang Anda masukkan. Periksa inbox atau folder spam.'])->header('Cache-Control', 'no-store');
        }
        if ($data['action'] === 'request') {
            $result = $otp->request($email);
            abort_unless(! $result['limited'], 429, 'Tunggu 60 detik sebelum meminta ulang. Maksimal 5 kode per jam.');

            return response()->json(['challengeId' => $result['challengeId'], 'message' => 'Kode verifikasi telah dikirim. Periksa inbox atau spam.'])->header('Cache-Control', 'no-store');
        }
        abort_unless($otp->verify($email, $data['challengeId'], (string) $data['code']), 401, 'Kode tidak valid, sudah digunakan, atau kedaluwarsa.');
        $donor = PaymentDonor::where('email', $email)->first();
        $items = $donor ? $history->history($donor->id) : [];
        $items = array_map(function ($item) {
            unset($item['trackingCode']);

            return $item;
        }, $items);

        return response()->json(['items' => $items])->header('Cache-Control', 'no-store');
    }

    public function status(Request $request, IpaymuService $gateway): JsonResponse
    {
        $data = $request->validate(['code' => 'sometimes|nullable|string|max:191']);
        $code = trim($data['code'] ?? '');
        if (! $code) {
            return response()->json(['found' => false]);
        }
        $row = PaymentTransaction::where('module_source', 'lazsip')->where('tracking_code', $code)->first();
        // Public status reads the local projection immediately. Webhooks/workers reconcile it.
        if ($row) $gateway->enqueueReconciliation($row);
        if ($row) {
            $campaign = $row->sourceType === 'campaign';
            $result = ['found' => true, 'code' => $row->trackingCode, 'type' => $campaign ? 'donasi' : 'zakat', 'label' => $campaign ? (LazsipCampaign::whereKey($row->sourceId)->value('title') ?? 'Donasi') : (LazsipZakatDetail::find($row->sourceId)?->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal'), 'amount' => $row->amount, 'adminFee' => $row->adminFee, 'paymentMethod' => $row->paymentMethod, 'status' => $row->status === 'pending' && $row->gatewayState === 'escrow' ? 'escrow' : $row->status, 'createdAt' => $row->createdAt];
            if ($row->status === 'pending') {
                $result += ['checkoutId' => $row->id, 'gateway' => $row->gateway];
            }

            return response()->json($result)->header('Cache-Control', 'no-store');
        }
        $donation = LazsipDonation::with('campaign:id,title')->find($code);
        $zakat = $donation ? null : LazsipZakatPayment::find($code);
        $row = $donation ?? $zakat;
        if (! $row) {
            return response()->json(['found' => false]);
        }

        return response()->json(['found' => true, 'code' => $row->id, 'type' => $donation ? 'donasi' : 'zakat', 'label' => $donation ? ($donation->campaign ? $donation->campaign->title : 'Donasi') : ($zakat->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal'), 'amount' => $row->amount, 'adminFee' => $donation ? $row->adminFee : 0, 'paymentMethod' => $row->paymentMethod, 'status' => $row->status, 'createdAt' => $row->createdAt])->header('Cache-Control', 'no-store');
    }

    public function donors(Request $request, DonorHistoryService $history): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $rows = PaymentDonor::where(fn ($query) => $query->whereHas('transactions', fn ($query) => $query->where('module_source', 'lazsip'))->orWhereHas('donations')->orWhereHas('zakatPayments'))->get();
        $summaries = $rows->map(fn ($donor) => $history->summary($donor))->filter()->sortByDesc('totalContribution')->values();
        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 100);

        return response()->json(['data' => $summaries->slice(($page - 1) * $perPage, $perPage)->values(), 'current_page' => $page, 'last_page' => max(1, (int) ceil($summaries->count() / $perPage))]);
    }

    public function donor(string $id, DonorHistoryService $history): JsonResponse
    {
        $summary = $history->summary(PaymentDonor::findOrFail($id));
        abort_unless($summary !== null, 404);

        return response()->json(['data' => $summary]);
    }

    public function donorHistory(Request $request, string $id, DonorHistoryService $history): JsonResponse
    {
        abort_unless($history->summary(PaymentDonor::findOrFail($id)) !== null, 404);

        return response()->json(['data' => $history->history($id)]);
    }
}
