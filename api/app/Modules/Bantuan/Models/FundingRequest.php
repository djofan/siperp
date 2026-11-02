<?php

namespace App\Modules\Bantuan\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FundingRequest extends Model
{
    protected $table = 'bantuan_funding_requests';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['total_amount' => 'integer', 'version' => 'integer', 'decided_at' => 'datetime'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(FundingRequestItem::class)->orderBy('application_id');
    }
}
