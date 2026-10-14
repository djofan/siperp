<?php

namespace App\Support;

use CaliCastle\Cuid;
use Illuminate\Database\Eloquent\Model;
use LogicException;

trait HasPrismaCuid
{
    public static function bootHasPrismaCuid(): void
    {
        static::creating(function (Model $model): void {
            if (! $model->getKey()) {
                $id = Cuid::make();
                if (! preg_match('/^c[a-z0-9]{24}$/D', $id)) {
                    throw new LogicException('Generator must produce a Prisma-compatible CUID v1.');
                }
                $model->setAttribute($model->getKeyName(), $id);
            }
        });
    }
}
