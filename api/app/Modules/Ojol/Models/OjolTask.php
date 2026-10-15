<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;

class OjolTask extends DomainModel
{
    protected $table = 'ojol_tasks';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['teacherId' => 'teacher_id', 'originalDeadline' => 'original_deadline', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['deadline' => 'immutable_datetime', 'original_deadline' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function teacher()
    {
        return $this->belongsTo(OjolMember::class, 'teacher_id', 'id');
    }

    public function groups()
    {
        return $this->hasMany(OjolTaskGroup::class, 'task_id', 'id');
    }

    public function approvers()
    {
        return $this->hasMany(OjolTaskApprover::class, 'task_id', 'id');
    }

    public function questions()
    {
        return $this->hasMany(OjolQuizQuestion::class, 'task_id', 'id');
    }

    public function submissions()
    {
        return $this->hasMany(OjolSubmission::class, 'task_id', 'id');
    }
}
