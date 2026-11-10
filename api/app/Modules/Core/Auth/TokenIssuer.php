<?php

namespace App\Modules\Core\Auth;

use App\Modules\Core\Models\User;
use Carbon\CarbonInterface;
use Laravel\Sanctum\NewAccessToken;

class TokenIssuer
{
    public function issue(User $user, string $name = 'next-server', ?CarbonInterface $expiresAt = null): NewAccessToken
    {
        return $user->createToken($name, ['*'], $expiresAt ?? now()->addDays(7));
    }
}
