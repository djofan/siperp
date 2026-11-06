<?php

namespace App\Support;

abstract class DomainPivotModel extends DomainModel
{
    protected array $compositeKeys = [];

    public static function bootHasPrismaCuid(): void {}

    protected function setKeysForSaveQuery($query)
    {
        foreach ($this->compositeKeys as $key) {
            $query->where($key, $this->getRawOriginal($key) ?? $this->getAttribute($key));
        }

        return $query;
    }

    protected function setKeysForSelectQuery($query)
    {
        return $this->setKeysForSaveQuery($query);
    }
}
