<?php

namespace App\Modules\Ojol\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<OjolSubmission, $this> */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(OjolSubmission::class, 'submission_id', 'id');
    }

    /** @return BelongsTo<OjolQuizQuestion, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(OjolQuizQuestion::class, 'question_id', 'id');
    }
}
