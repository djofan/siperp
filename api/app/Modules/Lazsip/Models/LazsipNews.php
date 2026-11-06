<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipNews extends DomainModel
{
    protected $table = 'lazsip_news';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['isPinned' => 'is_pinned', 'createdAt' => 'created_at'];

    protected $casts = ['is_pinned' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];
}
