<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipCampaignAdjustment extends DomainModel
{
    protected $table = 'lazsip_campaign_adjustments';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['campaignId' => 'campaign_id', 'createdAt' => 'created_at'];

    protected $casts = ['amount' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function campaign()
    {
        return $this->belongsTo(LazsipCampaign::class, 'campaign_id', 'id');
    }
}
