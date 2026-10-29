<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LazsipProgramApplicant extends DomainModel
{
    protected $table = 'lazsip_program_applicants';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['programId' => 'program_id', 'createdAt' => 'created_at'];

    protected $casts = ['created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<LazsipProgram, $this> */
    public function program(): BelongsTo
    {
        return $this->belongsTo(LazsipProgram::class, 'program_id', 'id');
    }
}
