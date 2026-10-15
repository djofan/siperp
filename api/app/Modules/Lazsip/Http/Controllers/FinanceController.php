<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Lazsip\Models\LazsipBeneficiary;
use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Lazsip\Models\LazsipPartner;
use App\Modules\Lazsip\Models\LazsipProgramApplicant;
use App\Modules\Lazsip\Models\LazsipZakatDetail;
use App\Modules\Lazsip\Models\LazsipZakatPayment;
use App\Modules\Lazsip\Services\CampaignService;
use App\Modules\Payment\Http\Controllers\PaymentController;
use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\ChartService;
use App\Modules\Payment\Services\CheckoutService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController
{
    public function legacyDonation(Request $request, CheckoutService $checkout): JsonResponse
    {
        $request->merge(['moduleSource' => 'lazsip', 'sourceType' => 'campaign', 'fundType' => 'infak', 'sourceId' => $request->input('campaignId')]);
        if (! $request->header('Idempotency-Key')) {
            $request->headers->set('Idempotency-Key', 'legacy-'.hash('sha256', json_encode($request->all()).'|'.$request->ip().'|'.intdiv(now()->getTimestamp(), 5)));
        }
        $result = app(PaymentController::class)->checkout($request, $checkout)->getData(true);

        return response()->json(['ok' => true, 'id' => $result['transactionId']], 201);
    }

    public function legacyPayments(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $source = $request->route('source');
        $query = $source === 'donations' ? LazsipDonation::with(['donor:id,name', 'campaign:id,title,unique_code']) : LazsipZakatPayment::with('donor:id,name');
        $page = $query->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100));
        $page->through(fn ($row) => [...$row->toArray(), 'donorName' => $row->donor->name]);

        return response()->json($page);
    }

    public function paymentRows(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $campaign = $request->route('source') === 'donations';
        $page = PaymentTransaction::with('donor:id,name')->where('module_source', 'lazsip')->where('source_type', $campaign ? 'campaign' : 'zakat')->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100));
        $titles = $campaign ? LazsipCampaign::whereIn('id', $page->getCollection()->pluck('source_id'))->pluck('title', 'id') : LazsipZakatDetail::whereIn('id', $page->getCollection()->pluck('source_id'))->pluck('zakat_type', 'id');
        $page->through(function ($row) use ($campaign, $titles) {
            $data = ['id' => $row->id, 'donorName' => $row->donor->name, 'amount' => $row->amount, 'adminFee' => $row->adminFee, 'paymentMethod' => $row->paymentMethod, 'status' => $row->status, 'createdAt' => $row->createdAt];

            return $campaign ? [...$data, 'campaign' => ['title' => $titles[$row->sourceId] ?? '(campaign tidak ditemukan)']] : [...$data, 'zakatType' => ($titles[$row->sourceId] ?? null) === 'fitrah' ? 'fitrah' : 'maal'];
        });

        return response()->json($page);
    }

    public function simulateLegacy(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:paid,failed']);
        $model = $request->route('source') === 'donations' ? LazsipDonation::class : LazsipZakatPayment::class;
        $model::findOrFail($id);
        $model::whereKey($id)->where('status', 'pending')->update(['status' => $data['status']]);

        return response()->json(['ok' => true]);
    }

    public function totals(): JsonResponse
    {
        return response()->json(['data' => [
            'donations' => (int) (LazsipDonation::where('status', 'paid')->sum('amount') + PaymentTransaction::where('module_source', 'lazsip')->where('source_type', 'campaign')->where('status', 'paid')->sum('amount')),
            'zakat' => (int) (LazsipZakatPayment::where('status', 'paid')->sum('amount') + PaymentTransaction::where('module_source', 'lazsip')->where('source_type', 'zakat')->where('status', 'paid')->sum('amount')),
        ]]);
    }

    public function dashboard(Request $request, CampaignService $campaigns, ChartService $charts): JsonResponse
    {
        $request->validate(['limit' => 'sometimes|integer|min:1|max:100', 'days' => 'sometimes|integer|min:1|max:90']);
        $limit = $request->integer('limit', 5);
        $days = $request->integer('days', 30);
        $paidDonors = PaymentDonor::where(fn ($query) => $query->whereHas('transactions', fn ($query) => $query->where('module_source', 'lazsip')->where('status', 'paid'))->orWhereHas('donations', fn ($query) => $query->where('status', 'paid'))->orWhereHas('zakatPayments', fn ($query) => $query->where('status', 'paid')))->count();
        $top = LazsipCampaign::where('status', 'active')->get()->map(fn ($row) => $campaigns->representation($row))->sortByDesc('currentAmount')->take($limit)->values();
        $recent = [];
        foreach (PaymentTransaction::with('donor:id,name')->where('module_source', 'lazsip')->orderByDesc('created_at')->limit($limit)->get() as $row) {
            $campaign = $row->sourceType === 'campaign';
            $label = $campaign ? 'Donasi — '.(LazsipCampaign::find($row->sourceId)?->title ?? 'Donasi') : (LazsipZakatDetail::find($row->sourceId)?->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal');
            $recent[] = ['id' => $row->id, 'label' => $label, 'donorName' => $row->donor->name, 'amount' => $campaign ? $row->amount + $row->adminFee : $row->amount, 'status' => $row->status, 'createdAt' => $row->createdAt];
        }
        foreach ([LazsipDonation::class, LazsipZakatPayment::class] as $model) {
            foreach ($model::with('donor:id,name')->orderByDesc('created_at')->limit($limit)->get() as $row) {
                $donation = $model === LazsipDonation::class;
                $recent[] = ['id' => $row->id, 'label' => $donation ? 'Donasi — '.$row->campaign->title : ($row->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal'), 'donorName' => $row->donor->name, 'amount' => $donation ? $row->amount + $row->adminFee : $row->amount, 'status' => $row->status, 'createdAt' => $row->createdAt];
            }
        }
        $since = CarbonImmutable::now('Asia/Jakarta')->startOfMonth()->utc();
        $donors = PaymentDonor::where(fn ($query) => $query->whereHas('transactions', fn ($query) => $query->where('module_source', 'lazsip')->where('created_at', '>=', $since))->orWhereHas('donations', fn ($query) => $query->where('created_at', '>=', $since))->orWhereHas('zakatPayments', fn ($query) => $query->where('created_at', '>=', $since)))->get();
        $new = $repeat = 0;
        foreach ($donors as $donor) {
            $earlier = $donor->transactions()->where('module_source', 'lazsip')->where('created_at', '<', $since)->exists() || $donor->donations()->where('created_at', '<', $since)->exists() || $donor->zakatPayments()->where('created_at', '<', $since)->exists();
            if ($earlier) {
                $repeat++;
            } else {
                $new++;
            }
        }
        $chart = $charts->summarize('lazsip');
        $daily = $chart['periods'][2]['daily'];
        $daily = array_map(fn ($day) => ['date' => $day['date'], 'total' => $day['amount']], array_slice($daily, -$days));

        return response()->json(['data' => ['counts' => ['activeCampaigns' => LazsipCampaign::where('status', 'active')->count(), 'totalBeneficiaries' => LazsipBeneficiary::count(), 'totalPartners' => LazsipPartner::count(), 'pendingTransactions' => LazsipDonation::where('status', 'pending')->count() + LazsipZakatPayment::where('status', 'pending')->count() + PaymentTransaction::where('module_source', 'lazsip')->where('status', 'pending')->count(), 'totalDonors' => $paidDonors], 'newApplicants' => LazsipProgramApplicant::where('status', 'baru')->count(), 'newVsRepeat' => ['newDonors' => $new, 'repeatDonors' => $repeat], 'totals' => $chart['totals'], 'top' => $top, 'recent' => collect($recent)->sortByDesc('createdAt')->take($limit)->values(), 'daily' => $daily]]);
    }
}
