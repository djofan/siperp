<?php

namespace App\Modules\Sip\Models;

use App\Support\DomainModel;

class SipPenyaluranBantuan extends DomainModel
{
    protected $table = 'sip_penyaluran_bantuan';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['createdAt' => 'created_at'];

    protected $casts = ['date' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];
}
