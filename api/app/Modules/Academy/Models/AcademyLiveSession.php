<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademyLiveSession extends DomainModel
{
    protected $table = 'academy_live_sessions';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['courseId' => 'course_id', 'startsAt' => 'starts_at', 'joinUrl' => 'join_url'];

    protected $casts = ['starts_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyCourse, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyCourse::class, 'course_id', 'id');
    }
}
