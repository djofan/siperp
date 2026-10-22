<?php

use App\Modules\Teknisi\Http\Controllers\QueryController;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('publishes only active outlet teams and public technician fields', function () {
    expect(config('database.default'))->toBe('sqlite');
    expect(config('database.connections.sqlite.database'))->toBe(':memory:');
    Schema::create('teknisi_outlets', function (Blueprint $table) {
        $table->string('id')->primary();
        $table->string('name');
        $table->string('address');
        $table->string('phone');
        $table->boolean('isActive');
    });
    Schema::create('teknisi_technicians', function (Blueprint $table) {
        $table->string('id')->primary();
        $table->string('outletId');
        $table->string('name');
        $table->string('specialty')->nullable();
        $table->boolean('isActive');
        $table->string('userId');
        $table->string('phone');
    });
    try {
        DB::table('teknisi_outlets')->insert([
            ['id' => 'active', 'name' => 'Outlet aktif', 'address' => 'Alamat outlet', 'phone' => '0800000', 'isActive' => true],
            ['id' => 'inactive', 'name' => 'Outlet nonaktif', 'address' => '-', 'phone' => '-', 'isActive' => false],
        ]);
        DB::table('teknisi_technicians')->insert([
            ['id' => 'visible', 'outletId' => 'active', 'name' => 'Teknisi aktif', 'specialty' => 'Servis HP', 'isActive' => true, 'userId' => 'private-user', 'phone' => 'private-phone'],
            ['id' => 'hidden', 'outletId' => 'active', 'name' => 'Teknisi nonaktif', 'specialty' => null, 'isActive' => false, 'userId' => 'private-user', 'phone' => 'private-phone'],
            ['id' => 'closed', 'outletId' => 'inactive', 'name' => 'Outlet tutup', 'specialty' => null, 'isActive' => true, 'userId' => 'private-user', 'phone' => 'private-phone'],
        ]);
        $response = app(QueryController::class)->publicOutlets()->getData(true);
        expect($response['data'])->toHaveCount(1);
        $team = $response['data'][0]['technicians'];
        expect($team)->toHaveCount(1);
        expect($team[0]['name'])->toBe('Teknisi aktif');
        expect(array_keys($team[0]))->toEqualCanonicalizing(['id', 'outletId', 'name', 'specialty']);
    } finally {
        Schema::dropIfExists('teknisi_technicians');
        Schema::dropIfExists('teknisi_outlets');
    }
});
