<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<TeknisiTicket, $this> */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(TeknisiTicket::class, 'ticketId', 'id');
    }
}
