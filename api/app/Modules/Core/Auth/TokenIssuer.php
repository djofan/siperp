<?php

namespace App\Modules\Core\Auth;

use App\Modules\Core\Models\User;
use Laravel\Sanctum\NewAccessToken;

class TokenIssuer
{
    public function issue(User $user, string $name = 'next-server'): NewAccessToken
    {
        return $user->createToken($name, ['*'], now()->addDays(7));
    }
}
