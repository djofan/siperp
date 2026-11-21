<?php

namespace App\Modules\Lazsip\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AffiliateReferralResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['referralCode' => $this->referral_code];
    }
}
