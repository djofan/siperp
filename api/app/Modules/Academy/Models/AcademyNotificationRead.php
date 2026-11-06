<?php

namespace App\Modules\Academy\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademyNotificationRead extends DomainModel
{
    protected $table = 'academy_notification_reads';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['profileId' => 'profile_id', 'readAt' => 'read_at'];

    protected $casts = ['read_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<ZakatAcademyProfile, $this> */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(ZakatAcademyProfile::class, 'profile_id', 'id');
    }
}
