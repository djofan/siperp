<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class ZakatAcademyCompletionRecord extends DomainModel
{
    protected $table = 'zakat_academy_completion_records';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['profileId' => 'profile_id', 'courseId' => 'course_id', 'isEligible' => 'is_eligible', 'completedAt' => 'completed_at', 'certificateUrl' => 'certificate_url', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['is_eligible' => 'boolean', 'completed_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function profile()
    {
        return $this->belongsTo(ZakatAcademyProfile::class, 'profile_id', 'id');
    }

    public function course()
    {
        return $this->belongsTo(ZakatAcademyCourse::class, 'course_id', 'id');
    }
}
