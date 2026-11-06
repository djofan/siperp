<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /** @return BelongsTo<OjolMember, $this> */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(OjolMember::class, 'teacher_id', 'id');
    }

    /** @return HasMany<OjolTaskGroup, $this> */
    public function groups(): HasMany
    {
        return $this->hasMany(OjolTaskGroup::class, 'task_id', 'id');
    }

    /** @return HasMany<OjolTaskApprover, $this> */
    public function approvers(): HasMany
    {
        return $this->hasMany(OjolTaskApprover::class, 'task_id', 'id');
    }

    /** @return HasMany<OjolQuizQuestion, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(OjolQuizQuestion::class, 'task_id', 'id');
    }

    /** @return HasMany<OjolSubmission, $this> */
    public function submissions(): HasMany
    {
        return $this->hasMany(OjolSubmission::class, 'task_id', 'id');
    }
}
