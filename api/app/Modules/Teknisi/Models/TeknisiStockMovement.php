<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class TeknisiStockMovement extends DomainModel
{
    protected $table = 'teknisi_stock_movements';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'createdAt';

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = ['quantity' => 'integer', 'createdAt' => 'immutable_datetime'];

    protected $hidden = [];

    public function part()
    {
        return $this->belongsTo(TeknisiPart::class, 'partId', 'id');
    }
}
