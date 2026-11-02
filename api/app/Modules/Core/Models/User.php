<?php

namespace App\Modules\Core\Models;

use App\Support\HasPrismaCuid;
use App\Modules\Core\Auth\AccountCodes;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property string $id
 * @property string $name
 * @property string $code
 * @property string $email
 * @property string $password_hash
 * @property bool $is_active
 * @property bool $is_superadmin
 */
class User extends Authenticatable
{
    use HasApiTokens;
    use HasPrismaCuid;

    protected $table = 'users';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $guarded = ['*'];

    protected $hidden = ['password_hash', 'superadmin_slot'];

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            if ($user->is_superadmin) {
                if (User::where('is_superadmin', true)->when($user->id, fn ($query) => $query->where('id', '!=', $user->id))->exists()) {
                    throw ValidationException::withMessages(['isSuperadmin' => 'Hanya satu akun superadmin SASIP01 diperbolehkan.']);
                }
                $user->code = 'SASIP01';
            } elseif ($user->code && str_starts_with(strtoupper($user->code), 'SASIP')) {
                throw ValidationException::withMessages(['code' => 'Kode SASIP01 hanya untuk superadmin.']);
            }
        });
        static::creating(function (User $user) {
            $user->code = $user->code ? AccountCodes::normalize($user->code) : AccountCodes::next();
            if (! $user->email) $user->email = strtolower($user->code).'@accounts.sip.invalid';
        });
        static::created(fn (User $user) => AccountCodes::register($user->id, $user->code));
        static::updated(function (User $user) {
            if (! $user->wasChanged('code')) return;
            AccountCodes::register($user->id, $user->code);
            DB::table('user_login_codes')->where('user_id', $user->id)->where('code', $user->getRawOriginal('code'))->delete();
        });
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_superadmin' => 'boolean', 'created_at' => 'immutable_datetime'];
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }
}
