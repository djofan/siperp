<?php

namespace App\Modules\Bantuan\Models;

use Illuminate\Database\Eloquent\Model;

class MustahiqProfile extends Model
{
    protected $table = 'bantuan_mustahiq_profiles';
    protected $primaryKey = 'nik_hash';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = ['*'];
    protected function casts(): array { return ['applicant' => 'encrypted:array', 'version' => 'integer']; }
}
