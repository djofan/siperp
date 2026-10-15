<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class ZakatAcademyCourse extends DomainModel
{
    protected $table = 'zakat_academy_courses';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['shortDescription' => 'short_description', 'thumbnailUrl' => 'thumbnail_url', 'materialUrl' => 'material_url', 'isPublished' => 'is_published', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at', 'durationDays' => 'duration_days', 'startsAt' => 'starts_at', 'isSimulation' => 'is_simulation', 'registrationOpen' => 'registration_open'];

    protected $casts = ['is_published' => 'boolean', 'order' => 'integer', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'quota' => 'integer', 'duration_days' => 'integer', 'starts_at' => 'immutable_datetime', 'is_simulation' => 'boolean', 'registration_open' => 'boolean'];

    protected $hidden = [];

    public function chapters()
    {
        return $this->hasMany(ZakatAcademyChapter::class, 'course_id', 'id');
    }

    public function enrollments()
    {
        return $this->hasMany(ZakatAcademyEnrollment::class, 'course_id', 'id');
    }

    public function completionRecords()
    {
        return $this->hasMany(ZakatAcademyCompletionRecord::class, 'course_id', 'id');
    }

    public function sessions()
    {
        return $this->hasMany(AcademyLiveSession::class, 'course_id', 'id');
    }

    public function discussions()
    {
        return $this->hasMany(AcademyDiscussion::class, 'course_id', 'id');
    }
}
