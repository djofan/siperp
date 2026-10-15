<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;

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

    public function pic()
    {
        return $this->belongsTo(TanwirMember::class, 'pic_id', 'id');
    }

    public function members()
    {
        return $this->hasMany(TanwirMember::class, 'group_id', 'id');
    }

    public function tasks()
    {
        return $this->hasMany(TanwirTaskGroup::class, 'group_id', 'id');
    }
}
