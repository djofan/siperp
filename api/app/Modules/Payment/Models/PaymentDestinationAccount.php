<?php

namespace App\Modules\Payment\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentDestinationAccount extends DomainModel
{
    protected $table = 'payment_destination_accounts';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['moduleSource' => 'module_source', 'fundType' => 'fund_type', 'bankName' => 'bank_name', 'accountNumber' => 'account_number', 'accountName' => 'account_name'];

    protected $casts = [];

    protected $hidden = [];

    /** @return HasMany<PaymentTransaction, $this> */
    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'destination_account_id', 'id');
    }
}
