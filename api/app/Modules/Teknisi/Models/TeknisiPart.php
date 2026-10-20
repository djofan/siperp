<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeknisiPart extends DomainModel
{
    protected $table = 'teknisi_parts';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = ['stock' => 'integer', 'minimum' => 'integer', 'price' => 'integer'];

    protected $hidden = [];

    /** @return BelongsTo<TeknisiOutlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(TeknisiOutlet::class, 'outletId', 'id');
    }

    /** @return HasMany<TeknisiPartUse, $this> */
    public function uses(): HasMany
    {
        return $this->hasMany(TeknisiPartUse::class, 'partId', 'id');
    }

    /** @return HasMany<TeknisiStockMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(TeknisiStockMovement::class, 'partId', 'id');
    }
}
