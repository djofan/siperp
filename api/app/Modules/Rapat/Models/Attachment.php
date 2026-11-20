<?php

namespace App\Modules\Rapat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attachment extends Model
{
    use SoftDeletes;

    protected $table = 'rapat_attachments';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = ['path', 'meeting_id', 'name', 'deleted_at'];

    protected function casts(): array
    {
        return ['name' => 'encrypted', 'size' => 'integer'];
    }
}
