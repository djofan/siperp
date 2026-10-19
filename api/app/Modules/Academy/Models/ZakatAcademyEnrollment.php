<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZakatAcademyEnrollment extends DomainModel
{
    protected $table = 'zakat_academy_enrollments';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['profileId' => 'profile_id', 'courseId' => 'course_id', 'createdAt' => 'created_at', 'groupJoinedAt' => 'group_joined_at'];

    protected $casts = ['created_at' => 'immutable_datetime', 'group_joined_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyProfile, $this> */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyProfile::class, 'profile_id', 'id');
    }

    /** @return BelongsTo<ZakatAcademyCourse, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyCourse::class, 'course_id', 'id');
    }
}
