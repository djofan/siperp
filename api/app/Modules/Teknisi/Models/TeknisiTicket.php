<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class TeknisiTicket extends DomainModel
{
    protected $table = 'teknisi_tickets';

    protected $primaryKey = 'id';

    public $timestamps = true;

    const CREATED_AT = 'createdAt';

    const UPDATED_AT = 'updatedAt';

    protected array $fieldMap = [];

    protected $casts = ['estimate' => 'integer', 'serviceCost' => 'integer', 'dueAt' => 'immutable_datetime', 'createdAt' => 'immutable_datetime', 'updatedAt' => 'immutable_datetime'];

    protected $hidden = [];

    public function outlet()
    {
        return $this->belongsTo(TeknisiOutlet::class, 'outletId', 'id');
    }

    public function technician()
    {
        return $this->belongsTo(TeknisiTechnician::class, 'technicianId', 'id');
    }

    public function participant()
    {
        return $this->belongsTo(TeknisiParticipant::class, 'participantId', 'id');
    }

    public function events()
    {
        return $this->hasMany(TeknisiEvent::class, 'ticketId', 'id');
    }

    public function partUses()
    {
        return $this->hasMany(TeknisiPartUse::class, 'ticketId', 'id');
    }
}
