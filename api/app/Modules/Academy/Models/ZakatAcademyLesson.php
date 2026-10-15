<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class ZakatAcademyLesson extends DomainModel
{
    protected $table = 'zakat_academy_lessons';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['chapterId' => 'chapter_id', 'shortDescription' => 'short_description', 'contentSummary' => 'content_summary', 'thumbnailUrl' => 'thumbnail_url', 'videoProvider' => 'video_provider', 'videoUrl' => 'video_url', 'isPublished' => 'is_published', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at', 'releaseDay' => 'release_day'];

    protected $casts = ['order' => 'integer', 'is_published' => 'boolean', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'release_day' => 'integer'];

    protected $hidden = [];

    public function chapter()
    {
        return $this->belongsTo(ZakatAcademyChapter::class, 'chapter_id', 'id');
    }

    public function attachments()
    {
        return $this->hasMany(ZakatAcademyLessonAttachment::class, 'lesson_id', 'id');
    }

    public function lessonProgress()
    {
        return $this->hasMany(ZakatAcademyLessonProgress::class, 'lesson_id', 'id');
    }

    public function notes()
    {
        return $this->hasMany(AcademyStudyNote::class, 'lesson_id', 'id');
    }
}
