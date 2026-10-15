<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;

class TanwirTask extends DomainModel
{
    protected $table = 'tanwir_tasks';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['teacherId' => 'teacher_id', 'originalDeadline' => 'original_deadline', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['deadline' => 'immutable_datetime', 'original_deadline' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function teacher()
    {
        return $this->belongsTo(TanwirMember::class, 'teacher_id', 'id');
    }

    public function groups()
    {
        return $this->hasMany(TanwirTaskGroup::class, 'task_id', 'id');
    }

    public function questions()
    {
        return $this->hasMany(TanwirQuizQuestion::class, 'task_id', 'id');
    }

    public function submissions()
    {
        return $this->hasMany(TanwirSubmission::class, 'task_id', 'id');
    }
}
