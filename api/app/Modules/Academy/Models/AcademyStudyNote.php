<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class AcademyStudyNote extends DomainModel
{
    protected $table = 'academy_study_notes';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = null;

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['profileId' => 'profile_id', 'lessonId' => 'lesson_id', 'updatedAt' => 'updated_at'];

    protected $casts = ['updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function profile()
    {
        return $this->belongsTo(ZakatAcademyProfile::class, 'profile_id', 'id');
    }

    public function lesson()
    {
        return $this->belongsTo(ZakatAcademyLesson::class, 'lesson_id', 'id');
    }
}
