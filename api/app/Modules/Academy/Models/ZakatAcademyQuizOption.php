<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZakatAcademyQuizOption extends DomainModel
{
    protected $table = 'zakat_academy_quiz_options';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['questionId' => 'question_id', 'isCorrect' => 'is_correct'];

    protected $casts = ['is_correct' => 'boolean'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyQuizQuestion, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyQuizQuestion::class, 'question_id', 'id');
    }
}
