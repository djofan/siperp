<?php

namespace App\Modules\Rapat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property array $payload
 * @property Carbon $meeting_date
 * @property Carbon|null $archived_at
 * @property Carbon|null $run_started_at
 */
class Meeting extends Model
{
    protected $table = 'rapat_meetings';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['payload' => 'encrypted:array', 'archived_at' => 'datetime', 'meeting_date' => 'date', 'run_started_at' => 'datetime'];
    }
}
