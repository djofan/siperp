<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainPivotModel;

class OjolTaskApprover extends DomainPivotModel
{
    protected $table = 'ojol_task_approvers';

    protected $primaryKey = 'task_id';

    protected array $compositeKeys = ['task_id', 'teacher_id'];

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['taskId' => 'task_id', 'teacherId' => 'teacher_id'];

    protected $casts = [];

    protected $hidden = [];

    public function task()
    {
        return $this->belongsTo(OjolTask::class, 'task_id', 'id');
    }

    public function teacher()
    {
        return $this->belongsTo(OjolMember::class, 'teacher_id', 'id');
    }
}
