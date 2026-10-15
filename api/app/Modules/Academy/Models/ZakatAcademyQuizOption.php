<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

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

    public function question()
    {
        return $this->belongsTo(ZakatAcademyQuizQuestion::class, 'question_id', 'id');
    }
}
