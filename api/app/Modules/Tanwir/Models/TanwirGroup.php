<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TanwirGroup extends DomainModel
{
    protected $table = 'tanwir_groups';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['picId' => 'pic_id', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<TanwirMember, $this> */
    public function pic(): BelongsTo
    {
        return $this->belongsTo(TanwirMember::class, 'pic_id', 'id');
    }

    /** @return HasMany<TanwirMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(TanwirMember::class, 'group_id', 'id');
    }

    /** @return HasMany<TanwirTaskGroup, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(TanwirTaskGroup::class, 'group_id', 'id');
    }
}
