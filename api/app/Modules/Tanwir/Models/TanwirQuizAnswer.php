<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;

class TanwirQuizAnswer extends DomainModel
{
    protected $table = 'tanwir_quiz_answers';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['submissionId' => 'submission_id', 'questionId' => 'question_id', 'selectedOption' => 'selected_option', 'isCorrect' => 'is_correct'];

    protected $casts = ['is_correct' => 'boolean'];

    protected $hidden = [];

    public function submission()
    {
        return $this->belongsTo(TanwirSubmission::class, 'submission_id', 'id');
    }

    public function question()
    {
        return $this->belongsTo(TanwirQuizQuestion::class, 'question_id', 'id');
    }
}
