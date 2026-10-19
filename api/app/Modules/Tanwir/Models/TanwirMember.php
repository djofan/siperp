<?php

namespace App\Modules\Tanwir\Models;

use App\Modules\Core\Models\User;
use App\Support\DomainModel;

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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function group()
    {
        return $this->belongsTo(TanwirGroup::class, 'group_id', 'id');
    }

    public function picGroups()
    {
        return $this->hasMany(TanwirGroup::class, 'pic_id', 'id');
    }

    public function tasks()
    {
        return $this->hasMany(TanwirTask::class, 'teacher_id', 'id');
    }

    public function submissions()
    {
        return $this->hasMany(TanwirSubmission::class, 'student_id', 'id');
    }

    public function reviewLogs()
    {
        return $this->hasMany(TanwirSubmissionLog::class, 'reviewer_id', 'id');
    }

    public function students()
    {
        return $this->hasMany(TanwirStudent::class, 'member_id', 'id');
    }
}
