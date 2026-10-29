<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZakatAcademyLessonAttachment extends DomainModel
{
    protected $table = 'zakat_academy_lesson_attachments';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['storagePath' => 'storage_path', 'lessonId' => 'lesson_id', 'fileUrl' => 'file_url', 'fileType' => 'file_type', 'fileSize' => 'file_size', 'createdAt' => 'created_at'];

    protected $casts = ['file_size' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = ['storage_path'];

    /** @return BelongsTo<ZakatAcademyLesson, $this> */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyLesson::class, 'lesson_id', 'id');
    }
}
