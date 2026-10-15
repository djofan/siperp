<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;

class ParticipantSequence extends DomainModel
{
    protected $table = 'participant_sequences';

    protected $primaryKey = 'module_slug';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['moduleSlug' => 'module_slug', 'lastNumber' => 'last_number'];

    protected $casts = ['last_number' => 'integer'];

    protected $hidden = [];
}
