<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class AcademyDiscussion extends DomainModel
{
    protected $table = 'academy_discussions';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['courseId' => 'course_id', 'profileId' => 'profile_id', 'createdAt' => 'created_at', 'answeredAt' => 'answered_at'];

    protected $casts = ['created_at' => 'immutable_datetime', 'answered_at' => 'immutable_datetime'];

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
