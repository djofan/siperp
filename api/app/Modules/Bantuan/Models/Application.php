<?php

namespace App\Modules\Bantuan\Models;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    protected $table = 'bantuan_applications';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['applicant' => 'encrypted:array', 'survey' => 'encrypted:array', 'handover' => 'encrypted:array',
            'bypass_reason' => 'encrypted', 'fund_reference' => 'encrypted',
            'amount' => 'integer', 'version' => 'integer', 'disbursed_at' => 'datetime', 'completed_at' => 'datetime'];
    }
}
