<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<OjolSubmission, $this> */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(OjolSubmission::class, 'submission_id', 'id');
    }

    /** @return BelongsTo<OjolMember, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(OjolMember::class, 'reviewer_id', 'id');
    }
}
