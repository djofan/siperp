<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ZakatAcademyChapter extends DomainModel
{
    protected $table = 'zakat_academy_chapters';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['courseId' => 'course_id', 'isPublished' => 'is_published', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['order' => 'integer', 'is_published' => 'boolean', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyCourse, $this> */
    public function course(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyCourse::class, 'course_id', 'id');
    }

    /** @return HasMany<ZakatAcademyLesson, $this> */
    public function lessons(): HasMany
    {
        return $this->hasMany(ZakatAcademyLesson::class, 'chapter_id', 'id');
    }

    /** @return HasMany<ZakatAcademyQuiz, $this> */
    public function quizzes(): HasMany
    {
        return $this->hasMany(ZakatAcademyQuiz::class, 'chapter_id', 'id');
    }
}
