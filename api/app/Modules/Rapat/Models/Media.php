<?php

namespace App\Modules\Rapat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/** @property array $payload */
class Media extends Model
{
    use SoftDeletes;

    protected $table = 'rapat_media';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['payload' => 'encrypted:array', 'transcribed' => 'boolean'];
    }
}
