<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class TeknisiOutlet extends DomainModel
{
    protected $table = 'teknisi_outlets';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'createdAt';

    const UPDATED_AT = null;

    protected array $fieldMap = [];

    protected $casts = ['isActive' => 'boolean', 'createdAt' => 'immutable_datetime'];

    protected $hidden = [];

    public function technicians()
    {
        return $this->hasMany(TeknisiTechnician::class, 'outletId', 'id');
    }

    public function tickets()
    {
        return $this->hasMany(TeknisiTicket::class, 'outletId', 'id');
    }

    public function parts()
    {
        return $this->hasMany(TeknisiPart::class, 'outletId', 'id');
    }
}
