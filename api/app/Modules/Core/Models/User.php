<?php

namespace App\Modules\Core\Models;

use App\Support\HasPrismaCuid;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property string $id
 * @property string $name
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

    protected $hidden = ['password_hash'];

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
