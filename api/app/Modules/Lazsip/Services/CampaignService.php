<?php

namespace App\Modules\Lazsip\Services;

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipCampaignAdjustment;
use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Payment\Models\PaymentTransaction;

class CampaignService
{
    public function representation(LazsipCampaign $row): array
    {
        $legacy = LazsipDonation::where('campaign_id', $row->id)->where('status', 'paid');
        $payments = PaymentTransaction::where('module_source', 'lazsip')->where('source_type', 'campaign')->where('source_id', $row->id)->where('status', 'paid');
        $adjustments = LazsipCampaignAdjustment::where('campaign_id', $row->id)->sum('amount');

        return [...$row->toArray(), 'currentAmount' => (int) ((clone $legacy)->sum('amount') + (clone $payments)->sum('amount') + $adjustments), 'donorCount' => $legacy->count() + $payments->count()];
    }
}
