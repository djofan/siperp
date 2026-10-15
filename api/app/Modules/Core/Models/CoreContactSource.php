<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;

class CoreContactSource extends DomainModel
{
    protected $table = 'core_contact_sources';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['contactId' => 'contact_id', 'sourceId' => 'source_id', 'syncedAt' => 'synced_at'];

    protected $casts = ['synced_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function contact()
    {
        return $this->belongsTo(CoreContact::class, 'contact_id', 'id');
    }
}
