<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipCampaignAdjustment;
use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Lazsip\Services\CampaignService;
use App\Modules\Payment\Models\PaymentDestinationAccount;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\DonorService;
use App\Modules\Payment\Services\ReceiptService;
use App\Modules\Payment\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampaignController
{
    public function index(Request $request, CampaignService $campaigns): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $page = LazsipCampaign::orderByDesc('is_pinned')->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100));
        $page->through(fn ($row) => $campaigns->representation($row));

        return response()->json($page);
    }

    public function show(string $id, CampaignService $campaigns): JsonResponse
    {
        return response()->json(['data' => $campaigns->representation(LazsipCampaign::findOrFail($id))]);
    }

    private function input(Request $request, ?string $id = null): array
    {
        return $request->validate(['title' => 'required|string|max:191', 'description' => 'required|string|max:1000000', 'targetAmount' => 'required|integer|min:1|max:2147483647', 'image' => 'sometimes|nullable|string|max:191', 'uniqueCode' => ['required', 'string', 'regex:/^\d{2}$/D', Rule::unique('lazsip_campaigns', 'unique_code')->ignore($id)], 'isPinned' => 'required|boolean', 'status' => 'required|in:active,completed']);
    }

    public function store(Request $request): JsonResponse
    {
        $row = new LazsipCampaign;
        $row->forceFill(['currentAmount' => 0, ...$this->input($request)])->save();

        return response()->json(['ok' => true, 'id' => $row->id], 201)->header('Location', $request->url().'/'.$row->id);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $row = LazsipCampaign::findOrFail($id);
        $row->forceFill($this->input($request, $id))->save();

        return response()->json(['ok' => true]);
    }

    public function status(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:active,completed']);
        $row = LazsipCampaign::findOrFail($id);
        $row->status = $data['status'];
        $row->save();

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id): JsonResponse
    {
        LazsipCampaign::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }

    public function adjust(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['amount' => 'required|integer|min:-2147483648|max:-1', 'note' => 'required|string|max:100000']);
        DB::transaction(function () use ($id, $data): void {
            $campaign = LazsipCampaign::whereKey($id)->lockForUpdate()->firstOrFail();
            $row = new LazsipCampaignAdjustment;
            $row->forceFill(['campaignId' => $id, ...$data])->save();
            $campaign->currentAmount += $data['amount'];
            $campaign->save();
        });

        return response()->json(['ok' => true]);
    }

    public function offline(Request $request, string $id, DonorService $donors, TransactionService $transactions, ReceiptService $receipts): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:191', 'phone' => 'sometimes|nullable|string|max:191', 'email' => 'sometimes|nullable|string|max:191', 'amount' => 'required|integer|min:1|max:2147483647']);
        $phone = ! empty($data['phone']) ? $donors->normalizePhone($data['phone']) : null;
        $email = ! empty($data['email']) ? $donors->normalizeEmail($data['email']) : null;
        abort_if(! empty($data['phone']) && ! $phone || ! empty($data['email']) && ! $email || (! $phone && ! $email), 422, 'Isi nomor WhatsApp atau email yang valid.');
        $row = DB::transaction(function () use ($id, $data, $phone, $email, $donors, $transactions, $receipts): PaymentTransaction {
            LazsipCampaign::whereKey($id)->lockForUpdate()->firstOrFail();
            $account = PaymentDestinationAccount::where('module_source', 'lazsip')->where('fund_type', 'infak')->orderBy('id')->lockForUpdate()->first();
            abort_unless($account !== null, 503, 'Rekening tujuan belum tersedia.');
            $donor = $donors->resolve(trim($data['name']), $phone, $email);
            $payment = new PaymentTransaction;
            $payment->forceFill(['trackingCode' => $transactions->trackingCode('lazsip'), 'moduleSource' => 'lazsip', 'sourceType' => 'campaign', 'sourceId' => $id, 'fundType' => 'infak', 'donorId' => $donor->id, 'isAnonymous' => false, 'amount' => $data['amount'], 'adminFee' => 0, 'paymentMethod' => 'Input Manual Admin', 'destinationAccountId' => $account->id, 'gateway' => 'manual', 'gatewayState' => 'not_started', 'status' => 'paid', 'paidAt' => now()])->save();
            $payment->refresh();
            $receipts->queue($payment);

            return $payment;
        }, 5);
        $receipts->deliver($row->id);

        return response()->json(['ok' => true, 'transactionId' => $row->id]);
    }

    public function history(Request $request, string $id): JsonResponse
    {
        LazsipCampaign::findOrFail($id);
        $entries = [];
        foreach (LazsipDonation::with('donor:id,name')->where('campaign_id', $id)->where('status', 'paid')->get() as $row) {
            $entries[] = ['id' => $row->id, 'kind' => 'donasi', 'label' => $row->isAnonymous ? 'Hamba Allah' : $row->donor->name, 'amount' => $row->amount, 'createdAt' => $row->createdAt];
        }
        foreach (PaymentTransaction::with('donor:id,name')->where('module_source', 'lazsip')->where('source_type', 'campaign')->where('source_id', $id)->where('status', 'paid')->get() as $row) {
            $entries[] = ['id' => $row->id, 'kind' => 'donasi', 'label' => $row->isAnonymous ? 'Hamba Allah' : $row->donor->name, 'amount' => $row->amount, 'createdAt' => $row->createdAt];
        }
        foreach (LazsipCampaignAdjustment::where('campaign_id', $id)->get() as $row) {
            $entries[] = ['id' => $row->id, 'kind' => 'penyesuaian', 'label' => $row->note, 'amount' => $row->amount, 'createdAt' => $row->createdAt];
        }
        $entries = collect($entries)->sortByDesc('createdAt')->values();
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 100);

        return response()->json(['data' => $entries->slice(($page - 1) * $perPage, $perPage)->values(), 'current_page' => $page, 'last_page' => max(1, (int) ceil($entries->count() / $perPage))]);
    }
}
