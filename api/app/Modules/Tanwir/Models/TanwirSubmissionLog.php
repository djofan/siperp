<?php

namespace App\Modules\Tanwir\Models;

use App\Support\DomainModel;

class TanwirSubmissionLog extends DomainModel
{
    protected $table = 'tanwir_submission_logs';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['submissionId' => 'submission_id', 'reviewerId' => 'reviewer_id', 'attemptNumber' => 'attempt_number', 'createdAt' => 'created_at'];

    protected $casts = ['attempt_number' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function submission()
    {
        return $this->belongsTo(TanwirSubmission::class, 'submission_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(TanwirMember::class, 'reviewer_id', 'id');
    }
}
