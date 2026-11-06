<?php

namespace App\Modules\Bantuan\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FundingRequestItem extends Model
{
    protected $table = 'bantuan_funding_request_items';

    public $timestamps = false;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['amount' => 'integer', 'submitted_version' => 'integer', 'decision_version' => 'integer'];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }
}
