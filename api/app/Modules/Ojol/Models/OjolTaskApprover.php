<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainPivotModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<OjolTask, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(OjolTask::class, 'task_id', 'id');
    }

    /** @return BelongsTo<OjolMember, $this> */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(OjolMember::class, 'teacher_id', 'id');
    }
}
