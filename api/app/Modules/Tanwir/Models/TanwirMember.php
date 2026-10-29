<?php

namespace App\Modules\Tanwir\Models;

use App\Modules\Core\Models\User;
use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TanwirMember extends DomainModel
{
    protected $table = 'tanwir_members';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['userId' => 'user_id', 'teachingPlace' => 'teaching_place', 'provinceId' => 'province_id', 'provinceName' => 'province_name', 'cityId' => 'city_id', 'cityName' => 'city_name', 'districtId' => 'district_id', 'districtName' => 'district_name', 'villageId' => 'village_id', 'villageName' => 'village_name', 'groupId' => 'group_id', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['latitude' => 'float', 'longitude' => 'float', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /** @return BelongsTo<TanwirGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(TanwirGroup::class, 'group_id', 'id');
    }

    /** @return HasMany<TanwirGroup, $this> */
    public function picGroups(): HasMany
    {
        return $this->hasMany(TanwirGroup::class, 'pic_id', 'id');
    }

    /** @return HasMany<TanwirTask, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(TanwirTask::class, 'teacher_id', 'id');
    }

    /** @return HasMany<TanwirSubmission, $this> */
    public function submissions(): HasMany
    {
        return $this->hasMany(TanwirSubmission::class, 'student_id', 'id');
    }

    /** @return HasMany<TanwirSubmissionLog, $this> */
    public function reviewLogs(): HasMany
    {
        return $this->hasMany(TanwirSubmissionLog::class, 'reviewer_id', 'id');
    }

    /** @return HasMany<TanwirStudent, $this> */
    public function students(): HasMany
    {
        return $this->hasMany(TanwirStudent::class, 'member_id', 'id');
    }
}
