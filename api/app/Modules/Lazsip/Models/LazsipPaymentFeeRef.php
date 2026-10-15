<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipPaymentFeeRef extends DomainModel
{
    protected $table = 'lazsip_payment_fee_refs';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['feeAmount' => 'fee_amount', 'feePercentage' => 'fee_percentage'];

    protected $casts = ['fee_amount' => 'integer', 'fee_percentage' => 'float'];

    protected $hidden = [];
}
