<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /** @return HasMany<ZakatAcademyChapter, $this> */
    public function chapters(): HasMany
    {
        return $this->hasMany(ZakatAcademyChapter::class, 'course_id', 'id');
    }

    /** @return HasMany<ZakatAcademyEnrollment, $this> */
    public function enrollments(): HasMany
    {
        return $this->hasMany(ZakatAcademyEnrollment::class, 'course_id', 'id');
    }

    /** @return HasMany<ZakatAcademyCompletionRecord, $this> */
    public function completionRecords(): HasMany
    {
        return $this->hasMany(ZakatAcademyCompletionRecord::class, 'course_id', 'id');
    }

    /** @return HasMany<AcademyLiveSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(AcademyLiveSession::class, 'course_id', 'id');
    }

    /** @return HasMany<AcademyDiscussion, $this> */
    public function discussions(): HasMany
    {
        return $this->hasMany(AcademyDiscussion::class, 'course_id', 'id');
    }
}
