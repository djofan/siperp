<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class ServiceDetail extends DomainModel
{
    protected $table = 'teknisi_service_details';

    protected $casts = [
        'capital' => 'integer', 'finalPrice' => 'integer', 'warrantyDays' => 'integer',
        'startedAt' => 'immutable_datetime', 'readyAt' => 'immutable_datetime',
        'collectedAt' => 'immutable_datetime', 'warrantyUntil' => 'immutable_datetime',
    ];
}
