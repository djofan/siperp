<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;

class OjolQuizQuestion extends DomainModel
{
    protected $table = 'ojol_quiz_questions';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['taskId' => 'task_id', 'optionA' => 'option_a', 'optionB' => 'option_b', 'optionC' => 'option_c', 'optionD' => 'option_d', 'correctOption' => 'correct_option', 'createdAt' => 'created_at'];

    protected $casts = ['order' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function task()
    {
        return $this->belongsTo(OjolTask::class, 'task_id', 'id');
    }

    public function answers()
    {
        return $this->hasMany(OjolQuizAnswer::class, 'question_id', 'id');
    }
}
