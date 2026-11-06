<?php

namespace App\Modules\Sip\Models;

use App\Support\DomainModel;

class SipLaporan extends DomainModel
{
    protected $table = 'sip_laporan';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['periodMonth' => 'period_month', 'periodYear' => 'period_year', 'fileUrl' => 'file_url', 'createdAt' => 'created_at'];

    protected $casts = ['period_month' => 'integer', 'period_year' => 'integer', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];
}
