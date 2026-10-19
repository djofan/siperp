<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;

class TanwirStudent extends DomainModel
{
    protected $table = 'tanwir_students';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['memberId' => 'member_id', 'className' => 'class_name', 'parentName' => 'parent_name', 'parentPhone' => 'parent_phone', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['age' => 'integer', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function member()
    {
        return $this->belongsTo(TanwirMember::class, 'member_id', 'id');
    }
}
