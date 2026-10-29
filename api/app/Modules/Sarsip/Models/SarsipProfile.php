<?php

namespace App\Modules\Sarsip\Models;

use App\Support\DomainModel;

class SarsipProfile extends DomainModel
{
    protected $table = 'sarsip_profiles';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = [];

    protected $hidden = [];
}
