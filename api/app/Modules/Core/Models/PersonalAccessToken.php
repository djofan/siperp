<?php

namespace App\Modules\Core\Models;

use App\Support\HasPrismaCuid;
use Laravel\Sanctum\PersonalAccessToken as SanctumToken;

class PersonalAccessToken extends SanctumToken
{
    use HasPrismaCuid;

    public $incrementing = false;

    protected $keyType = 'string';
}
