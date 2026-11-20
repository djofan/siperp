<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('keeps draft articles private and supports editorial CRUD without a cover image', function () {
    $this->withoutMiddleware();
    $url = '/api/v1/lazsip/articles';
    $input = ['title' => 'Panduan zakat', 'content' => "## Ketentuan\n\nIsi dan dalil.", 'category' => 'zakat', 'status' => 'draft', 'author' => 'Tim LAZSIP', 'source' => 'Kitab rujukan, halaman 25'];
    $id = $this->postJson($url, $input)->assertCreated()->json('id');
    $this->getJson($url.'/'.$id)->assertNotFound();
    $this->getJson($url)->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/lazsip/admin/articles/'.$id)->assertOk()->assertJsonPath('data.author', 'Tim LAZSIP')->assertJsonPath('data.source', $input['source']);
    $this->putJson($url.'/'.$id, [...$input, 'status' => 'published'])->assertOk();
    $this->getJson($url)->assertOk()->assertJsonPath('data.0.id', $id);
    $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.content', $input['content']);
    $this->putJson($url.'/'.$id, ['title' => 'Revisi', 'content' => 'Isi baru', 'status' => 'published'])->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonPath('data.author', 'Tim LAZSIP');
    $this->putJson($url.'/'.$id, [...$input, 'category' => null, 'author' => null, 'source' => null])->assertOk();
    $this->getJson('/api/v1/lazsip/admin/articles/'.$id)->assertJsonPath('data.author', null)->assertJsonPath('data.source', null);
    $this->deleteJson($url.'/'.$id)->assertOk();
    $this->getJson('/api/v1/lazsip/admin/articles/'.$id)->assertNotFound();
});

it('rejects invalid article fields and does not accept a client supplied identity', function () {
    $this->withoutMiddleware();
    $url = '/api/v1/lazsip/articles';
    $input = ['title' => 'Artikel', 'content' => 'Isi', 'status' => 'published'];
    foreach ([['title' => ' '], ['content' => ''], ['category' => 'internal'], ['status' => 'scheduled'], ['author' => str_repeat('a', 192)], ['source' => str_repeat('a', 10001)]] as $bad) {
        $this->postJson($url, [...$input, ...$bad])->assertUnprocessable();
    }
    $id = $this->postJson($url, [...$input, 'id' => 'client-controlled'])->assertCreated()->json('id');
    expect($id)->not->toBe('client-controlled');
});

it('requires authentication for article management', function () {
    $this->getJson('/api/v1/lazsip/admin/articles')->assertUnauthorized();
    $this->postJson('/api/v1/lazsip/articles', ['title' => 'Judul', 'content' => 'Isi', 'status' => 'published'])->assertUnauthorized();
    $this->putJson('/api/v1/lazsip/articles/missing', [])->assertUnauthorized();
    $this->deleteJson('/api/v1/lazsip/articles/missing')->assertUnauthorized();
});
