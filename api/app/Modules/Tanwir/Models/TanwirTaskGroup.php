<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainPivotModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TanwirTaskGroup extends DomainPivotModel
{
    protected $table = 'tanwir_task_groups';

    protected $primaryKey = 'task_id';

    protected array $compositeKeys = ['task_id', 'group_id'];

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['taskId' => 'task_id', 'groupId' => 'group_id'];

    protected $casts = [];

    protected $hidden = [];

    /** @return BelongsTo<TanwirTask, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(TanwirTask::class, 'task_id', 'id');
    }

    /** @return BelongsTo<TanwirGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(TanwirGroup::class, 'group_id', 'id');
    }
}
