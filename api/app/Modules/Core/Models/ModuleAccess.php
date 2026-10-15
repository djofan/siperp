<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;

class ModuleAccess extends DomainModel
{
    protected $table = 'module_access';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['userId' => 'user_id', 'moduleId' => 'module_id', 'createdAt' => 'created_at'];

    protected $casts = ['created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function module()
    {
        return $this->belongsTo(Module::class, 'module_id', 'id');
    }
}
