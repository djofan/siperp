<?php

namespace App\Modules\Teknisi\Models;

use App\Support\DomainModel;

class ServiceMedia extends DomainModel
{
    protected $table = 'teknisi_service_media';

    protected $hidden = ['path'];
}
