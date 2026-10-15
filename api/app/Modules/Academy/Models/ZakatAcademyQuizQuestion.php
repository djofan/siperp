<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class ZakatAcademyQuizQuestion extends DomainModel
{
    protected $table = 'zakat_academy_quiz_questions';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['quizId' => 'quiz_id', 'createdAt' => 'created_at'];

    protected $casts = ['order' => 'integer', 'created_at' => 'immutable_datetime', 'weight' => 'integer'];

    protected $hidden = [];

    public function quiz()
    {
        return $this->belongsTo(ZakatAcademyQuiz::class, 'quiz_id', 'id');
    }

    public function options()
    {
        return $this->hasMany(ZakatAcademyQuizOption::class, 'question_id', 'id');
    }
}
