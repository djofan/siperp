<?php

namespace App\Modules\Lazsip\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AffiliateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->user->name,
            'email' => $this->user->email, 'phone' => $this->phone, 'isActive' => $this->is_active,
            'joinedAt' => $this->created_at->toISOString(),
            'referralCode' => $this->referral_code,
            'referralPath' => $this->referral_code ? '/lazsip/r/'.$this->referral_code : null,
            'features' => ['referralTracking' => false, 'commissions' => false, 'withdrawals' => false]];
    }
}
