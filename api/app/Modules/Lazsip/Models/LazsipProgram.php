<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LazsipProgram extends DomainModel
{
    protected $table = 'lazsip_programs';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['documentationPhotos' => 'documentation_photos', 'formUrl' => 'form_url', 'isPinned' => 'is_pinned', 'registrationOpen' => 'registration_open', 'createdAt' => 'created_at'];

    protected $casts = ['documentation_photos' => 'array', 'is_pinned' => 'boolean', 'registration_open' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return HasMany<LazsipProgramApplicant, $this> */
    public function applicants(): HasMany
    {
        return $this->hasMany(LazsipProgramApplicant::class, 'program_id', 'id');
    }
}
