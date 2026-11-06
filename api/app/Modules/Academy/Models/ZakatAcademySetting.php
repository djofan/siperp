<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class ZakatAcademySetting extends DomainModel
{
    protected $table = 'zakat_academy_settings';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = null;

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['updatedAt' => 'updated_at'];

    protected $casts = ['updated_at' => 'immutable_datetime'];

    protected $hidden = [];
}
