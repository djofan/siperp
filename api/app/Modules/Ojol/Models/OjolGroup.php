<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;

class OjolGroup extends DomainModel
{
    protected $table = 'ojol_groups';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function members()
    {
        return $this->hasMany(OjolMember::class, 'group_id', 'id');
    }

    public function tasks()
    {
        return $this->hasMany(OjolTaskGroup::class, 'group_id', 'id');
    }
}
