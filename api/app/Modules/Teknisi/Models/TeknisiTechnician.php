<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /** @return BelongsTo<TeknisiOutlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(TeknisiOutlet::class, 'outletId', 'id');
    }

    /** @return HasMany<TeknisiTicket, $this> */
    public function tickets(): HasMany
    {
        return $this->hasMany(TeknisiTicket::class, 'technicianId', 'id');
    }
}
