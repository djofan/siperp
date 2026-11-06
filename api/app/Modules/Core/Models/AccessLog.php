<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;

class AccessLog extends DomainModel
{
    protected $table = 'access_logs';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['createdAt' => 'created_at'];

    protected $casts = ['created_at' => 'immutable_datetime'];

    protected $hidden = [];
}
