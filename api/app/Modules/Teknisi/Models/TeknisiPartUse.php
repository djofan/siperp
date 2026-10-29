<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeknisiPartUse extends DomainModel
{
    protected $table = 'teknisi_part_uses';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'createdAt';

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = ['quantity' => 'integer', 'unitPrice' => 'integer', 'createdAt' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<TeknisiTicket, $this> */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(TeknisiTicket::class, 'ticketId', 'id');
    }

    /** @return BelongsTo<TeknisiPart, $this> */
    public function part(): BelongsTo
    {
        return $this->belongsTo(TeknisiPart::class, 'partId', 'id');
    }
}
