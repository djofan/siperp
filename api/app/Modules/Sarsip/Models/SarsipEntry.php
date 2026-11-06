<?php

namespace App\Modules\Sarsip\Models;

use App\Support\DomainModel;

class SarsipEntry extends DomainModel
{
    protected $table = 'sarsip_entries';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['eventDate' => 'event_date', 'targetAmount' => 'target_amount', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['event_date' => 'immutable_datetime', 'target_amount' => 'integer', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];
}
