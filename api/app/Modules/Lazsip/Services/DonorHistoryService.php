<?php

namespace App\Modules\Lazsip\Services;

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Lazsip\Models\LazsipZakatDetail;
use App\Modules\Lazsip\Models\LazsipZakatPayment;
use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Models\PaymentTransaction;

class DonorHistoryService
{
    public function history(string $donorId): array
    {
        $items = [];
        $titles = LazsipCampaign::pluck('title', 'id');
        $types = LazsipZakatDetail::pluck('zakat_type', 'id');
        foreach (PaymentTransaction::where('module_source', 'lazsip')->where('donor_id', $donorId)->get() as $row) {
            if ($row->status === 'pending' && $row->gatewayState === 'escrow') {
                $row->status = 'escrow'; // Presentation only; never save this derived status.
            }
            $items[] = ['trackingCode' => $row->trackingCode, 'type' => $row->sourceType === 'campaign' ? 'donasi' : 'zakat', 'label' => $row->sourceType === 'campaign' ? ($titles[$row->sourceId] ?? 'Donasi') : (($types[$row->sourceId] ?? null) === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal'), 'amount' => $row->amount, 'status' => $row->status, 'createdAt' => $row->createdAt];
        }
        foreach (LazsipDonation::with('campaign:id,title')->where('donor_id', $donorId)->get() as $row) {
            $items[] = ['trackingCode' => $row->id, 'type' => 'donasi', 'label' => $row->campaign ? $row->campaign->title : 'Donasi', 'amount' => $row->amount, 'status' => $row->status, 'createdAt' => $row->createdAt];
        }
        foreach (LazsipZakatPayment::where('donor_id', $donorId)->get() as $row) {
            $items[] = ['trackingCode' => $row->id, 'type' => 'zakat', 'label' => $row->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal', 'amount' => $row->amount, 'status' => $row->status, 'createdAt' => $row->createdAt];
        }

        return collect($items)->sortByDesc('createdAt')->values()->all();
    }

    public function summary(PaymentDonor $donor): ?array
    {
        $items = $this->history($donor->id);
        if (! $items) {
            return null;
        }
        $types = [];
        foreach ($items as $item) {
            $types[$item['type'] === 'donasi' ? 'infaq' : 'zakat'] = true;
        }

        return ['id' => $donor->id, 'name' => $donor->name, 'phone' => $donor->phone, 'email' => $donor->email, 'types' => array_keys($types), 'totalContribution' => array_sum(array_column(array_filter($items, fn ($item) => $item['status'] === 'paid'), 'amount')), 'contributionCount' => count($items), 'lastContributionAt' => $items[0]['createdAt']];
    }
}
