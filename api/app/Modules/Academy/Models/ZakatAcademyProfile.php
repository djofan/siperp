<?php

namespace App\Modules\Academy\Models;

use App\Modules\Core\Models\User;
use App\Support\DomainModel;

class ZakatAcademyProfile extends DomainModel
{
    protected $table = 'zakat_academy_profiles';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['userId' => 'user_id', 'legacyCertificateUrl' => 'legacy_certificate_url', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at', 'mustChangePassword' => 'must_change_password', 'deletedAt' => 'deleted_at'];

    protected $casts = ['created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'must_change_password' => 'boolean', 'deleted_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function enrollments()
    {
        return $this->hasMany(ZakatAcademyEnrollment::class, 'profile_id', 'id');
    }

    public function lessonProgress()
    {
        return $this->hasMany(ZakatAcademyLessonProgress::class, 'profile_id', 'id');
    }

    public function quizAttempts()
    {
        return $this->hasMany(ZakatAcademyQuizAttempt::class, 'profile_id', 'id');
    }

    public function completionRecords()
    {
        return $this->hasMany(ZakatAcademyCompletionRecord::class, 'profile_id', 'id');
    }

    public function notes()
    {
        return $this->hasMany(AcademyStudyNote::class, 'profile_id', 'id');
    }

    public function questions()
    {
        return $this->hasMany(AcademyDiscussion::class, 'profile_id', 'id');
    }

    public function notificationReads()
    {
        return $this->hasMany(AcademyNotificationRead::class, 'profile_id', 'id');
    }
}
