<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class TeknisiEvent extends DomainModel
{
    protected $table = 'teknisi_events';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'createdAt';

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = ['createdAt' => 'immutable_datetime'];

    protected $hidden = [];

    public function ticket()
    {
        return $this->belongsTo(TeknisiTicket::class, 'ticketId', 'id');
    }
}
