<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;

class OjolSubmissionLog extends DomainModel
{
    protected $table = 'ojol_submission_logs';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['submissionId' => 'submission_id', 'reviewerId' => 'reviewer_id', 'attemptNumber' => 'attempt_number', 'createdAt' => 'created_at'];

    protected $casts = ['attempt_number' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function submission()
    {
        return $this->belongsTo(OjolSubmission::class, 'submission_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(OjolMember::class, 'reviewer_id', 'id');
    }
}
