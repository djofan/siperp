<?php

namespace App\Modules\Teknisi\Models;

use App\Modules\Core\Models\User;
use App\Support\DomainModel;

class TeknisiParticipant extends DomainModel
{
    protected $table = 'teknisi_participants';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'createdAt';

    const UPDATED_AT = null;

    protected array $fieldMap = ['deletedAt' => 'deleted_at'];

    protected $casts = ['createdAt' => 'immutable_datetime', 'deleted_at' => 'immutable_datetime'];

    protected $hidden = [];

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', 'id');
    }

    public function tickets()
    {
        return $this->hasMany(TeknisiTicket::class, 'participantId', 'id');
    }
}
