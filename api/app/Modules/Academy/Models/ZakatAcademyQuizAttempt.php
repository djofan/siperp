<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZakatAcademyQuizAttempt extends DomainModel
{
    protected $table = 'zakat_academy_quiz_attempts';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['profileId' => 'profile_id', 'quizId' => 'quiz_id', 'attemptNumber' => 'attempt_number', 'startedAt' => 'started_at', 'submittedAt' => 'submitted_at', 'isCompleted' => 'is_completed', 'createdAt' => 'created_at'];

    protected $casts = ['attempt_number' => 'integer', 'score' => 'float', 'passed' => 'boolean', 'answers' => 'array', 'started_at' => 'immutable_datetime', 'submitted_at' => 'immutable_datetime', 'is_completed' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyProfile, $this> */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyProfile::class, 'profile_id', 'id');
    }

    /** @return BelongsTo<ZakatAcademyQuiz, $this> */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyQuiz::class, 'quiz_id', 'id');
    }
}
