<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LazsipCampaign extends DomainModel
{
    protected $table = 'lazsip_campaigns';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['targetAmount' => 'target_amount', 'currentAmount' => 'current_amount', 'uniqueCode' => 'unique_code', 'isPinned' => 'is_pinned', 'createdAt' => 'created_at'];

    protected $casts = ['target_amount' => 'integer', 'current_amount' => 'integer', 'is_pinned' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return HasMany<LazsipDonation, $this> */
    public function donations(): HasMany
    {
        return $this->hasMany(LazsipDonation::class, 'campaign_id', 'id');
    }

    /** @return HasMany<LazsipCampaignAdjustment, $this> */
    public function adjustments(): HasMany
    {
        return $this->hasMany(LazsipCampaignAdjustment::class, 'campaign_id', 'id');
    }
}
