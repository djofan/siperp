<?php

namespace App\Modules\Sarsip\Models;

use App\Support\DomainModel;

class SarsipPaymentMethod extends DomainModel
{
    protected $table = 'sarsip_payment_methods';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['feeAmount' => 'fee_amount', 'feePercentage' => 'fee_percentage'];

    protected $casts = ['fee_amount' => 'integer', 'fee_percentage' => 'float'];

    protected $hidden = [];
}
