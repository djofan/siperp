<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class TeknisiPart extends DomainModel
{
    protected $table = 'teknisi_parts';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = ['stock' => 'integer', 'minimum' => 'integer', 'price' => 'integer'];

    protected $hidden = [];

    public function outlet()
    {
        return $this->belongsTo(TeknisiOutlet::class, 'outletId', 'id');
    }

    public function uses()
    {
        return $this->hasMany(TeknisiPartUse::class, 'partId', 'id');
    }

    public function movements()
    {
        return $this->hasMany(TeknisiStockMovement::class, 'partId', 'id');
    }
}
