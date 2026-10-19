<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;

class TanwirSubmission extends DomainModel
{
    protected $table = 'tanwir_submissions';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['taskId' => 'task_id', 'studentId' => 'student_id', 'filePath' => 'file_path', 'fileMime' => 'file_mime', 'attemptsCount' => 'attempts_count', 'isLate' => 'is_late', 'submittedAt' => 'submitted_at', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['attempts_count' => 'integer', 'score' => 'integer', 'is_late' => 'boolean', 'submitted_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function task()
    {
        return $this->belongsTo(TanwirTask::class, 'task_id', 'id');
    }

    public function student()
    {
        return $this->belongsTo(TanwirMember::class, 'student_id', 'id');
    }

    public function logs()
    {
        return $this->hasMany(TanwirSubmissionLog::class, 'submission_id', 'id');
    }

    public function answers()
    {
        return $this->hasMany(TanwirQuizAnswer::class, 'submission_id', 'id');
    }
}
