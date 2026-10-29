<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('supports documentation CRUD for activities and empowerment programs', function (string $resource, array $extra) {
    $this->withoutMiddleware();
    $input = ['title' => 'Galeri pengujian', 'description' => 'Keterangan pengujian', 'image' => '/aid/pendidikan.jpg', 'isPinned' => false, ...$extra];
    $photos = [
        ['id' => 'one', 'image' => '/aid/pendidikan.jpg', 'caption' => 'Satu', 'isDemo' => true],
        ['id' => 'two', 'image' => '/aid/kesehatan.jpg', 'caption' => 'Dua', 'isDemo' => true],
    ];
    $url = '/api/v1/lazsip/'.$resource;
    $id = $this->postJson($url, [...$input, 'documentationPhotos' => $photos])->assertCreated()->json('id');
    $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.documentationPhotos.0.id', 'one');
    $photos[0]['caption'] = 'Keterangan diubah';
    $this->putJson($url.'/'.$id, [...$input, 'documentationPhotos' => array_reverse($photos)])->assertOk();
    $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.documentationPhotos.0.id', 'two')->assertJsonPath('data.documentationPhotos.1.caption', 'Keterangan diubah');
    $this->putJson($url.'/'.$id, $input)->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonCount(2, 'data.documentationPhotos');
    $this->getJson('/api/v1/lazsip/admin/'.$resource.'/'.$id)->assertOk()->assertJsonCount(2, 'data.documentationPhotos');
    $this->putJson($url.'/'.$id, [...$input, 'documentationPhotos' => []])->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonCount(0, 'data.documentationPhotos');
    $this->putJson($url.'/'.$id, [...$input, 'documentationPhotos' => [['id' => 'invalid', 'image' => 'javascript:alert(1)', 'caption' => 'Tidak valid']]])->assertUnprocessable();
})->with([
    'activities' => ['activities', ['date' => '2026-10-22']],
    'programs' => ['programs', ['type' => 'berita', 'requirements' => 'Persyaratan pengujian', 'formUrl' => null]],
]);
