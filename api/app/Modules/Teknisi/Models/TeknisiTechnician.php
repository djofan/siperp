<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class TeknisiTechnician extends DomainModel
{
    protected $table = 'teknisi_technicians';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['activeOutletId' => 'active_outlet_id'];

    protected $casts = ['isActive' => 'boolean'];

    protected $hidden = [];

    public function outlet()
    {
        return $this->belongsTo(TeknisiOutlet::class, 'outletId', 'id');
    }

    public function tickets()
    {
        return $this->hasMany(TeknisiTicket::class, 'technicianId', 'id');
    }
}
