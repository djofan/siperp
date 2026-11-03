<?php

use App\Modules\Core\Http\Middleware\RequireActiveUser;
use App\Modules\Core\Http\Middleware\RequireModuleAccess;
use App\Modules\Core\Http\Middleware\RequirePublicModule;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Preserve global middleware, including conversion of empty strings to null.
    $this->withoutMiddleware([
        Authenticate::class,
        RequireActiveUser::class,
        RequireModuleAccess::class,
        RequirePublicModule::class,
    ]);
});

it('persists contact details for the public page with optional social links blank', function () {
    $content = [
        'address' => "Kantor LAZSIP\nCileungsi, Bogor",
        'phone' => '081234567890',
        'email' => 'kontak@example.com',
        'instagram' => '',
        'facebook' => '',
        'youtube' => '',
    ];

    $this->putJson('/api/v1/lazsip/site-content/kontak', ['content' => $content])->assertOk();
    $this->getJson('/api/v1/lazsip/site-content/kontak')->assertOk()->assertExactJson(['data' => $content]);

    $content['phone'] = '';
    $content['address'] = 'Alamat baru';
    $this->putJson('/api/v1/lazsip/site-content/kontak', ['content' => $content])->assertOk();
    $this->getJson('/api/v1/lazsip/site-content/kontak')->assertOk()->assertExactJson(['data' => $content]);

    $this->putJson('/api/v1/lazsip/site-content/kontak', ['content' => ['email' => ['invalid']]])
        ->assertUnprocessable();
    $this->getJson('/api/v1/lazsip/site-content/kontak')->assertExactJson(['data' => $content]);
});
