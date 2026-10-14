<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Http\Requests\LoginRequest;

class LoginController
{
    public function __invoke(LoginRequest $request): never
    {
        abort(501, 'Login will be implemented during the Core migration.');
    }
}
