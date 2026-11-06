<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainPivotModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OjolTaskGroup extends DomainPivotModel
{
    protected $table = 'ojol_task_groups';

    protected $primaryKey = 'task_id';

    protected array $compositeKeys = ['task_id', 'group_id'];

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['taskId' => 'task_id', 'groupId' => 'group_id'];

    protected $casts = [];

    protected $hidden = [];

    /** @return BelongsTo<OjolTask, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(OjolTask::class, 'task_id', 'id');
    }

    /** @return BelongsTo<OjolGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(OjolGroup::class, 'group_id', 'id');
    }
}
