<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipSiteContent extends DomainModel
{
    protected $table = 'lazsip_site_content';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['sectionKey' => 'section_key', 'contentJson' => 'content_json'];

    protected $casts = [];

    protected $hidden = [];
}
