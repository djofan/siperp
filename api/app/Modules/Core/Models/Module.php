<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;

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

    public function moduleAccess()
    {
        return $this->hasMany(ModuleAccess::class, 'module_id', 'id');
    }
}
