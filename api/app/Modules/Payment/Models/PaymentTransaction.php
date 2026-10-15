<?php

namespace App\Modules\Payment\Models;

use App\Support\DomainModel;

class PaymentTransaction extends DomainModel
{
    protected $table = 'payment_transactions';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['trackingCode' => 'tracking_code', 'moduleSource' => 'module_source', 'sourceType' => 'source_type', 'sourceId' => 'source_id', 'fundType' => 'fund_type', 'donorId' => 'donor_id', 'isAnonymous' => 'is_anonymous', 'adminFee' => 'admin_fee', 'paymentMethod' => 'payment_method', 'destinationAccountId' => 'destination_account_id', 'midtransOrderId' => 'midtrans_order_id', 'gatewayState' => 'gateway_state', 'gatewayMerchantId' => 'gateway_merchant_id', 'gatewayCheckoutUrl' => 'gateway_checkout_url', 'createdAt' => 'created_at', 'paidAt' => 'paid_at'];

    protected $casts = ['is_anonymous' => 'boolean', 'amount' => 'integer', 'admin_fee' => 'integer', 'created_at' => 'immutable_datetime', 'paid_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function destinationAccount()
    {
        return $this->belongsTo(PaymentDestinationAccount::class, 'destination_account_id', 'id');
    }

    public function donor()
    {
        return $this->belongsTo(PaymentDonor::class, 'donor_id', 'id');
    }

    public function receipt()
    {
        return $this->hasOne(PaymentReceipt::class, 'transaction_id', 'id');
    }
}
