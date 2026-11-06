<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CoreContact extends DomainModel
{
    protected $table = 'core_contacts';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return HasMany<CoreContactSource, $this> */
    public function sources(): HasMany
    {
        return $this->hasMany(CoreContactSource::class, 'contact_id', 'id');
    }
}
