<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ZakatAcademyQuiz extends DomainModel
{
    protected $table = 'zakat_academy_quizzes';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['chapterId' => 'chapter_id', 'passingScore' => 'passing_score', 'isPublished' => 'is_published', 'isActive' => 'is_active', 'quizDate' => 'quiz_date', 'timeLimitMinutes' => 'time_limit_minutes', 'allowRetake' => 'allow_retake', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at', 'closesAt' => 'closes_at', 'releaseDay' => 'release_day'];

    protected $casts = ['passing_score' => 'integer', 'is_published' => 'boolean', 'is_active' => 'boolean', 'quiz_date' => 'immutable_datetime', 'time_limit_minutes' => 'integer', 'allow_retake' => 'boolean', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'closes_at' => 'immutable_datetime', 'release_day' => 'integer'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyChapter, $this> */
    public function chapter(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyChapter::class, 'chapter_id', 'id');
    }

    /** @return HasMany<ZakatAcademyQuizQuestion, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(ZakatAcademyQuizQuestion::class, 'quiz_id', 'id');
    }

    /** @return HasMany<ZakatAcademyQuizAttempt, $this> */
    public function attempts(): HasMany
    {
        return $this->hasMany(ZakatAcademyQuizAttempt::class, 'quiz_id', 'id');
    }
}
