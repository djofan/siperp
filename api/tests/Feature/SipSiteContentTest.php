<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware([
        Illuminate\Auth\Middleware\Authenticate::class,
        App\Modules\Core\Http\Middleware\RequireActiveUser::class,
        App\Modules\Core\Http\Middleware\RequireModuleAccess::class,
        App\Modules\Core\Http\Middleware\RequirePublicModule::class,
    ]);
});

it('saves the hero image while optional links are empty and preserves them as strings', function () {
    $content = ['backgroundImage' => '/api/sip/files/hero-test.webp', 'title' => 'Judul hero', 'infaqUrl' => '', 'whatsappUrl' => '', 'profilVisible' => 'false'];
    $this->putJson('/api/v1/sip/site-content/hero', ['content' => $content])->assertOk();
    $this->getJson('/api/v1/sip/site-content/hero')->assertOk()->assertJsonPath('data', $content);
    $content['backgroundImage'] = '/api/sip/files/hero-replacement.webp';
    $this->putJson('/api/v1/sip/site-content/hero', ['content' => $content])->assertOk();
    $this->getJson('/api/v1/sip/site-content/hero')->assertJsonPath('data.backgroundImage', $content['backgroundImage'])->assertJsonPath('data.infaqUrl', '');
});

it('rejects structured field values instead of saving invalid content', function () {
    $this->putJson('/api/v1/sip/site-content/hero', ['content' => ['title' => ['invalid']]])->assertUnprocessable();
});

it('saves the hero image with optional links left blank', function () {
    $content = [
        'backgroundImage' => '/uploads/sip/12345678-1234-1234-1234-123456789012.webp',
        'title' => 'Bahagia dengan Membahagiakan Orang Lain',
        'infaqUrl' => '',
        'whatsappUrl' => '',
        'profilVisible' => 'false',
    ];

    $this->putJson('/api/v1/sip/site-content/hero', ['content' => $content])->assertOk();
    $this->getJson('/api/v1/sip/site-content/hero')->assertOk()->assertExactJson(['data' => $content]);

    $content['backgroundImage'] = '';
    $this->putJson('/api/v1/sip/site-content/hero', ['content' => $content])->assertOk();
    $this->getJson('/api/v1/sip/site-content/hero')->assertExactJson(['data' => $content]);
});

it('still rejects invalid content values', function (mixed $value) {
    $this->putJson('/api/v1/sip/site-content/hero', ['content' => ['title' => $value]])
        ->assertUnprocessable();
})->with([
    'nested object' => [['nested' => 'invalid']],
    'number' => [123],
    'oversized string' => [str_repeat('a', 100001)],
]);
