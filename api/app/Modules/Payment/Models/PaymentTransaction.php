<?php

namespace App\Modules\Payment\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PaymentTransaction extends DomainModel
{
    protected $table = 'payment_transactions';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['trackingCode' => 'tracking_code', 'moduleSource' => 'module_source', 'sourceType' => 'source_type', 'sourceId' => 'source_id', 'fundType' => 'fund_type', 'donorId' => 'donor_id', 'isAnonymous' => 'is_anonymous', 'adminFee' => 'admin_fee', 'paymentMethod' => 'payment_method', 'destinationAccountId' => 'destination_account_id', 'gatewayReferenceId' => 'gateway_reference_id', 'gatewaySessionId' => 'gateway_session_id', 'gatewayTransactionId' => 'gateway_transaction_id', 'gatewayState' => 'gateway_state', 'gatewayAccountId' => 'gateway_account_id', 'gatewayCheckoutUrl' => 'gateway_checkout_url', 'createdAt' => 'created_at', 'paidAt' => 'paid_at'];

    protected $casts = ['is_anonymous' => 'boolean', 'amount' => 'integer', 'admin_fee' => 'integer', 'created_at' => 'immutable_datetime', 'paid_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<PaymentDestinationAccount, $this> */
    public function destinationAccount(): BelongsTo
    {
        return $this->belongsTo(PaymentDestinationAccount::class, 'destination_account_id', 'id');
    }

    /** @return BelongsTo<PaymentDonor, $this> */
    public function donor(): BelongsTo
    {
        return $this->belongsTo(PaymentDonor::class, 'donor_id', 'id');
    }

    /** @return HasOne<PaymentReceipt, $this> */
    public function receipt(): HasOne
    {
        return $this->hasOne(PaymentReceipt::class, 'transaction_id', 'id');
    }
}
