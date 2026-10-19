<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;

abstract class DomainModel extends Model
{
    use HasPrismaCuid;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $dateFormat = 'Y-m-d H:i:s.v';

    public $timestamps = false;

    public static $snakeAttributes = false;

    protected $guarded = ['*'];

    protected array $fieldMap = [];

    public function getAttribute($key)
    {
        return parent::getAttribute($this->fieldMap[$key] ?? $key);
    }

    public function setAttribute($key, $value)
    {
        return parent::setAttribute($this->fieldMap[$key] ?? $key, $value);
    }

    public function toArray(): array
    {
        $reverse = array_flip($this->fieldMap);
        $result = [];
        foreach (parent::toArray() as $key => $value) {
            $result[$reverse[$key] ?? $key] = $value;
        }

        return $result;
    }
}
