<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /** @return BelongsTo<TeknisiOutlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(TeknisiOutlet::class, 'outletId', 'id');
    }

    /** @return BelongsTo<TeknisiTechnician, $this> */
    public function technician(): BelongsTo
    {
        return $this->belongsTo(TeknisiTechnician::class, 'technicianId', 'id');
    }

    /** @return BelongsTo<TeknisiParticipant, $this> */
    public function participant(): BelongsTo
    {
        return $this->belongsTo(TeknisiParticipant::class, 'participantId', 'id');
    }

    /** @return HasMany<TeknisiEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(TeknisiEvent::class, 'ticketId', 'id');
    }

    /** @return HasMany<TeknisiPartUse, $this> */
    public function partUses(): HasMany
    {
        return $this->hasMany(TeknisiPartUse::class, 'ticketId', 'id');
    }
}
