<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipPartner extends DomainModel
{
    protected $table = 'lazsip_partners';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = [];

    protected $hidden = [];
}
