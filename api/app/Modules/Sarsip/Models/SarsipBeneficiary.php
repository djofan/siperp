<?php

namespace App\Modules\Sarsip\Models;

use App\Support\DomainModel;

class SarsipBeneficiary extends DomainModel
{
    protected $table = 'sarsip_beneficiaries';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = 'updated_at';

    protected array $fieldMap = ['publicName' => 'public_name', 'isPublished' => 'is_published', 'receivedAt' => 'received_at', 'archivedAt' => 'archived_at', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    protected $casts = ['amount' => 'integer', 'is_published' => 'boolean', 'received_at' => 'immutable_datetime', 'archived_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];

    protected $hidden = [];
}
