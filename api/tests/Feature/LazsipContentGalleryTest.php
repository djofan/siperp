<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('supports documentation CRUD for public content details', function (string $resource, array $extra) {
    $this->withoutMiddleware();
    $input = ['title' => 'Galeri pengujian', 'description' => 'Keterangan pengujian', 'image' => '/aid/pendidikan.jpg', 'isPinned' => false, ...$extra];
    $photos = [
        ['id' => 'one', 'image' => '/aid/pendidikan.jpg', 'caption' => 'Satu', 'isDemo' => true],
        ['id' => 'two', 'image' => '/aid/kesehatan.jpg', 'caption' => 'Dua', 'isDemo' => true],
    ];
    $url = '/api/v1/lazsip/'.$resource;
    $id = $this->postJson($url, [...$input, 'documentationPhotos' => $photos])->assertCreated()->json('id');
    $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.documentationPhotos.0.id', 'one');
    if ($resource === 'beneficiaries') {
        $this->getJson($url.'/'.$id)->assertJsonMissingPath('data.address')->assertJsonMissingPath('data.nik')->assertJsonMissingPath('data.birthDate');
    }
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
    'news' => ['news', ['content'=>'Isi berita pengujian', 'status'=>'published']],
    'beneficiaries' => ['beneficiaries', ['name'=>'Penerima uji', 'address'=>'Alamat privat', 'problemFaced'=>'Kondisi uji', 'birthDate'=>'1990-01-01', 'age'=>36, 'gender'=>'perempuan', 'referralSource'=>'Informasi uji', 'photo'=>'/aid/pendidikan.jpg', 'needs'=>'Kebutuhan uji', 'aidType'=>'pendidikan', 'amountReceived'=>100000, 'verifierName'=>'Petugas uji', 'verifierArea'=>'Bogor', 'maritalStatus'=>'menikah']],
]);

it('keeps draft news galleries private', function () {
    $this->withoutMiddleware();
    $photos = [['id'=>'one', 'image'=>'/aid/pendidikan.jpg', 'caption'=>'Dokumentasi publik']];
    $id = $this->postJson('/api/v1/lazsip/news', ['title'=>'Draft', 'content'=>'Belum terbit', 'status'=>'draft', 'isPinned'=>false, 'documentationPhotos'=>$photos])->assertCreated()->json('id');
    $this->getJson('/api/v1/lazsip/news/'.$id)->assertNotFound();
    $this->getJson('/api/v1/lazsip/admin/news/'.$id)->assertOk()->assertJsonCount(1, 'data.documentationPhotos');
});
