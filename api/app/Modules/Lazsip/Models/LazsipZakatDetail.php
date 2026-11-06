<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipZakatDetail extends DomainModel
{
    protected $table = 'lazsip_zakat_details';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['zakatType' => 'zakat_type', 'goldPriceSnapshot' => 'gold_price_snapshot', 'jiwaCount' => 'jiwa_count', 'createdAt' => 'created_at'];

    protected $casts = ['gold_price_snapshot' => 'integer', 'jiwa_count' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];
}
