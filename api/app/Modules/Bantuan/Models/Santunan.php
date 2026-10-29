<?php

namespace App\Modules\Bantuan\Models;

use Illuminate\Database\Eloquent\Model;

class Santunan extends Model
{
    protected $table = 'bantuan_santunan';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'recipient' => 'encrypted:array',
            'report' => 'encrypted:array',
            'amount' => 'integer',
            'version' => 'integer',
            'period' => 'date',
            'transferred_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
