<?php

namespace App\Modules\Academy\Models;

use App\Modules\Core\Models\User;
use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /** @return HasMany<ZakatAcademyEnrollment, $this> */
    public function enrollments(): HasMany
    {
        return $this->hasMany(ZakatAcademyEnrollment::class, 'profile_id', 'id');
    }

    /** @return HasMany<ZakatAcademyLessonProgress, $this> */
    public function lessonProgress(): HasMany
    {
        return $this->hasMany(ZakatAcademyLessonProgress::class, 'profile_id', 'id');
    }

    /** @return HasMany<ZakatAcademyQuizAttempt, $this> */
    public function quizAttempts(): HasMany
    {
        return $this->hasMany(ZakatAcademyQuizAttempt::class, 'profile_id', 'id');
    }

    /** @return HasMany<ZakatAcademyCompletionRecord, $this> */
    public function completionRecords(): HasMany
    {
        return $this->hasMany(ZakatAcademyCompletionRecord::class, 'profile_id', 'id');
    }

    /** @return HasMany<AcademyStudyNote, $this> */
    public function notes(): HasMany
    {
        return $this->hasMany(AcademyStudyNote::class, 'profile_id', 'id');
    }

    /** @return HasMany<AcademyDiscussion, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(AcademyDiscussion::class, 'profile_id', 'id');
    }

    /** @return HasMany<AcademyNotificationRead, $this> */
    public function notificationReads(): HasMany
    {
        return $this->hasMany(AcademyNotificationRead::class, 'profile_id', 'id');
    }
}
