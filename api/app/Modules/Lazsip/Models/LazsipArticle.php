<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipArticle extends DomainModel
{
    protected $table = 'lazsip_articles';

    protected array $fieldMap = ['createdAt' => 'created_at'];

    protected $casts = ['created_at' => 'immutable_datetime'];
}
