<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('uses an editable news date without rewriting creation history', function (string $module) {
    $this->withoutMiddleware();
    $url = '/api/v1/'.$module.'/news';
    $input = ['title'=>'Berita uji', 'content'=>'Isi berita', 'image'=>'https://example.test/news.jpg', 'isPinned'=>false, 'status'=>'published'];
    $id = $this->postJson($url, [...$input, 'newsDate'=>'2025-02-03'])->assertCreated()->json('id');
    $created = $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.newsDate', '2025-02-03')->json('data.createdAt');
    $this->putJson($url.'/'.$id, [...$input, 'newsDate'=>'2024-01-01'])->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonPath('data.newsDate', '2024-01-01')->assertJsonPath('data.createdAt', $created);
    $this->putJson($url.'/'.$id, $input)->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonPath('data.newsDate', '2024-01-01');
    $newer = $this->postJson($url, [...$input, 'newsDate'=>'2025-01-01'])->assertCreated()->json('id');
    $this->getJson($url)->assertOk()->assertJsonPath('data.0.id', $newer);
    $this->putJson($url.'/'.$id, [...$input, 'newsDate'=>'2025-02-30'])->assertUnprocessable();
    $this->putJson($url.'/'.$id, [...$input, 'newsDate'=>null])->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonPath('data.newsDate', null)->assertJsonPath('data.createdAt', $created);
})->with(['lazsip', 'sip']);
