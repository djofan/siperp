<?php

namespace App\Modules\Sip\Models;

use App\Support\DomainModel;

class SipSiteContent extends DomainModel
{
    protected $table = 'sip_site_content';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['sectionKey' => 'section_key', 'contentJson' => 'content_json'];

    protected $casts = [];

    protected $hidden = [];
}
