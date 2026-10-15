<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;

class OjolQuizAnswer extends DomainModel
{
    protected $table = 'ojol_quiz_answers';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['submissionId' => 'submission_id', 'questionId' => 'question_id', 'selectedOption' => 'selected_option', 'isCorrect' => 'is_correct'];

    protected $casts = ['is_correct' => 'boolean'];

    protected $hidden = [];

    public function submission()
    {
        return $this->belongsTo(OjolSubmission::class, 'submission_id', 'id');
    }

    public function question()
    {
        return $this->belongsTo(OjolQuizQuestion::class, 'question_id', 'id');
    }
}
