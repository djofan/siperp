<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class ZakatAcademyLessonProgress extends DomainModel
{
    protected $table = 'zakat_academy_lesson_progress';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['profileId' => 'profile_id', 'lessonId' => 'lesson_id', 'completedAt' => 'completed_at', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at', 'audioPosition' => 'audio_position', 'audioSource' => 'audio_source'];

    protected $casts = ['completed' => 'boolean', 'completed_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'audio_position' => 'float'];

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
