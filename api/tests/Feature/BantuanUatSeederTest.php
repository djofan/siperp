<?php

use Database\Seeders\BantuanUatSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('refuses UAT seeding outside the isolated local MySQL development environment', function () {
    expect(fn () => app(BantuanUatSeeder::class)->run())->toThrow(RuntimeException::class,
        'Data UAT hanya boleh dibuat pada database development lokal terisolasi.');
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('bantuan_applications', 0);
});
