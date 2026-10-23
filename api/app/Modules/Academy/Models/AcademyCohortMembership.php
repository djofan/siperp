<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;

class AcademyCohortMembership extends DomainModel
{
    protected $table = 'academy_cohort_memberships';

    protected array $fieldMap = ['cohortId' => 'cohort_id', 'profileId' => 'profile_id', 'joinedAt' => 'joined_at', 'finishedAt' => 'finished_at'];

    protected $casts = ['joined_at' => 'immutable_datetime', 'finished_at' => 'immutable_datetime'];
}
