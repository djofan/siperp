<?php

namespace App\Modules\Lazsip\Models;

use App\Modules\Payment\Models\PaymentDonor;
use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LazsipZakatPayment extends DomainModel
{
    protected $table = 'lazsip_zakat_payments';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['donorId' => 'donor_id', 'zakatType' => 'zakat_type', 'adminFee' => 'admin_fee', 'coversFee' => 'covers_fee', 'isAnonymous' => 'is_anonymous', 'goldPriceSnapshot' => 'gold_price_snapshot', 'jiwaCount' => 'jiwa_count', 'paymentMethod' => 'payment_method', 'createdAt' => 'created_at'];

    protected $casts = ['amount' => 'integer', 'admin_fee' => 'integer', 'covers_fee' => 'boolean', 'is_anonymous' => 'boolean', 'gold_price_snapshot' => 'integer', 'jiwa_count' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<PaymentDonor, $this> */
    public function donor(): BelongsTo
    {
        return $this->belongsTo(PaymentDonor::class, 'donor_id', 'id');
    }
}
