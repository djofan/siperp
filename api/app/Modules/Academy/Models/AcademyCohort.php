<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class AcademyCohort extends DomainModel
{
    protected $table = 'academy_cohorts';

    public $timestamps = true;

    protected $hidden = ['quota'];

    protected array $fieldMap = ['registrationOpen' => 'registration_open', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['registration_open' => 'boolean', 'quota' => 'integer', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    public function participants(): HasManyThrough
    {
        return $this->hasManyThrough(ZakatAcademyProfile::class, AcademyCohortMembership::class, 'cohort_id', 'id', 'id', 'profile_id')->whereNull('zakat_academy_profiles.deleted_at');
    }
}
