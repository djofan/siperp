<?php

namespace App\Modules\Ojol\Models;

use App\Modules\Core\Models\User;
use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OjolMember extends DomainModel
{
    protected $table = 'ojol_members';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['userId' => 'user_id', 'provinceId' => 'province_id', 'provinceName' => 'province_name', 'cityId' => 'city_id', 'cityName' => 'city_name', 'districtId' => 'district_id', 'districtName' => 'district_name', 'villageId' => 'village_id', 'villageName' => 'village_name', 'groupId' => 'group_id', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['latitude' => 'float', 'longitude' => 'float', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /** @return BelongsTo<OjolGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(OjolGroup::class, 'group_id', 'id');
    }

    /** @return HasMany<OjolTask, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(OjolTask::class, 'teacher_id', 'id');
    }

    /** @return HasMany<OjolSubmission, $this> */
    public function submissions(): HasMany
    {
        return $this->hasMany(OjolSubmission::class, 'student_id', 'id');
    }

    /** @return HasMany<OjolSubmissionLog, $this> */
    public function reviewLogs(): HasMany
    {
        return $this->hasMany(OjolSubmissionLog::class, 'reviewer_id', 'id');
    }

    /** @return HasMany<OjolTaskApprover, $this> */
    public function approverTasks(): HasMany
    {
        return $this->hasMany(OjolTaskApprover::class, 'teacher_id', 'id');
    }
}
