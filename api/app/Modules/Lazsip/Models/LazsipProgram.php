<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipProgram extends DomainModel
{
    protected $table = 'lazsip_programs';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['formUrl' => 'form_url', 'isPinned' => 'is_pinned', 'registrationOpen' => 'registration_open', 'createdAt' => 'created_at'];

    protected $casts = ['is_pinned' => 'boolean', 'registration_open' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function applicants()
    {
        return $this->hasMany(LazsipProgramApplicant::class, 'program_id', 'id');
    }
}
