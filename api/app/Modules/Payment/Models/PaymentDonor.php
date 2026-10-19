<?php

namespace App\Modules\Payment\Models;

use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Lazsip\Models\LazsipZakatPayment;
use App\Support\DomainModel;

class PaymentDonor extends DomainModel
{
    protected $table = 'payment_donors';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['createdAt' => 'created_at'];

    protected $casts = ['created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function transactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'donor_id', 'id');
    }

    public function donations()
    {
        return $this->hasMany(LazsipDonation::class, 'donor_id', 'id');
    }

    public function zakatPayments()
    {
        return $this->hasMany(LazsipZakatPayment::class, 'donor_id', 'id');
    }
}
