<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends DomainModel
{
    protected $table = 'modules';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['isActive' => 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected $hidden = [];

    /** @return HasMany<ModuleAccess, $this> */
    public function moduleAccess(): HasMany
    {
        return $this->hasMany(ModuleAccess::class, 'module_id', 'id');
    }
}
