<?php

namespace App\Modules\Lazsip\Models;

use App\Modules\Core\Models\User;
use App\Support\HasPrismaCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Affiliate extends Model
{
    use HasPrismaCuid;

    protected $table = 'lazsip_affiliates';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected $casts = ['is_active' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected static function booted(): void
    {
        static::creating(function (Affiliate $affiliate): void {
            do {
                $code = bin2hex(random_bytes(10));
            } while (static::where('referral_code', $code)->exists());
            $affiliate->referral_code = $code;
        });
        static::updating(function (Affiliate $affiliate): void {
            if ($affiliate->isDirty('referral_code')) {
                throw new \LogicException('Referral codes cannot be changed.');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
