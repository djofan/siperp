<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

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

    public function ticket()
    {
        return $this->belongsTo(TeknisiTicket::class, 'ticketId', 'id');
    }

    public function part()
    {
        return $this->belongsTo(TeknisiPart::class, 'partId', 'id');
    }
}
