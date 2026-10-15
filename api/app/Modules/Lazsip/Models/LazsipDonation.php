<?php

namespace App\Modules\Lazsip\Models;

use App\Modules\Payment\Models\PaymentDonor;
use App\Support\DomainModel;

class LazsipDonation extends DomainModel
{
    protected $table = 'lazsip_donations';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['campaignId' => 'campaign_id', 'donorId' => 'donor_id', 'adminFee' => 'admin_fee', 'coversFee' => 'covers_fee', 'isAnonymous' => 'is_anonymous', 'paymentMethod' => 'payment_method', 'createdAt' => 'created_at'];

    protected $casts = ['amount' => 'integer', 'admin_fee' => 'integer', 'covers_fee' => 'boolean', 'is_anonymous' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function campaign()
    {
        return $this->belongsTo(LazsipCampaign::class, 'campaign_id', 'id');
    }

    public function donor()
    {
        return $this->belongsTo(PaymentDonor::class, 'donor_id', 'id');
    }
}
