<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /** @return BelongsTo<TanwirMember, $this> */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(TanwirMember::class, 'teacher_id', 'id');
    }

    /** @return HasMany<TanwirTaskGroup, $this> */
    public function groups(): HasMany
    {
        return $this->hasMany(TanwirTaskGroup::class, 'task_id', 'id');
    }

    /** @return HasMany<TanwirQuizQuestion, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(TanwirQuizQuestion::class, 'task_id', 'id');
    }

    /** @return HasMany<TanwirSubmission, $this> */
    public function submissions(): HasMany
    {
        return $this->hasMany(TanwirSubmission::class, 'task_id', 'id');
    }
}
