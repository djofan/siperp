<?php

namespace App\Modules\Payment\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentReceipt extends DomainModel
{
    protected $table = 'payment_receipts';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['transactionId' => 'transaction_id', 'firstAttemptAt' => 'first_attempt_at', 'lockedUntil' => 'locked_until', 'nextAttemptAt' => 'next_attempt_at', 'sentAt' => 'sent_at', 'providerId' => 'provider_id', 'lastError' => 'last_error', 'createdAt' => 'created_at'];

    protected $casts = ['attempts' => 'integer', 'first_attempt_at' => 'immutable_datetime', 'locked_until' => 'immutable_datetime', 'next_attempt_at' => 'immutable_datetime', 'sent_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<PaymentTransaction, $this> */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class, 'transaction_id', 'id');
    }
}
