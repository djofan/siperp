<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates, edits, reorders, removes and preserves campaign documentation', function () {
    $this->withoutMiddleware();
    $input = ['title' => 'Test gallery', 'description' => 'Test', 'targetAmount' => 100000,
        'uniqueCode' => '97', 'isPinned' => false, 'status' => 'active'];
    $photos = [
        ['id' => 'photo-one', 'image' => '/aid/pendidikan.jpg', 'caption' => 'Contoh', 'isDemo' => true],
        ['id' => 'photo-two', 'image' => '/aid/kesehatan.jpg', 'caption' => 'Contoh dua', 'isDemo' => true],
    ];
    $id = $this->postJson('/api/v1/lazsip/campaigns', [...$input, 'documentationPhotos' => $photos])->assertCreated()->json('id');
    $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertOk()->assertJsonPath('data.documentationPhotos.0.id', 'photo-one');
    $photos[0]['caption'] = 'Keterangan diubah';
    $this->putJson('/api/v1/lazsip/campaigns/'.$id, [...$input, 'documentationPhotos' => array_reverse($photos)])->assertOk();
    $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertOk()
        ->assertJsonPath('data.documentationPhotos.0.id', 'photo-two')->assertJsonPath('data.documentationPhotos.1.caption', 'Keterangan diubah');
    $this->putJson('/api/v1/lazsip/campaigns/'.$id, $input)->assertOk();
    $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertJsonCount(2, 'data.documentationPhotos');
    $this->putJson('/api/v1/lazsip/campaigns/'.$id, [...$input, 'documentationPhotos' => []])->assertOk();
    $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertJsonCount(0, 'data.documentationPhotos');
    $this->putJson('/api/v1/lazsip/campaigns/'.$id, [...$input, 'documentationPhotos' => [['id' => 'unsafe', 'image' => 'javascript:alert(1)', 'caption' => 'invalid']]])->assertUnprocessable();
    $this->assertDatabaseHas('lazsip_campaigns', ['id' => $id, 'target_amount' => 100000, 'current_amount' => 0]);
});

it('accepts campaigns without a nominal target and preserves or clears targets on update', function () {
    $this->withoutMiddleware();
    $input = ['title'=>'Campaign tanpa target','description'=>'Donasi berkelanjutan','uniqueCode'=>'96','isPinned'=>false,'status'=>'active'];
    $id=$this->postJson('/api/v1/lazsip/campaigns',$input)->assertCreated()->json('id');
    $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertOk()->assertJsonPath('data.targetAmount',0);
    $this->putJson('/api/v1/lazsip/campaigns/'.$id,[...$input,'targetAmount'=>1000000])->assertOk();
    $this->putJson('/api/v1/lazsip/campaigns/'.$id,$input)->assertOk();
    $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertJsonPath('data.targetAmount',1000000);
    foreach ([null,0] as $target) {
        $this->putJson('/api/v1/lazsip/campaigns/'.$id,[...$input,'targetAmount'=>$target])->assertOk();
        $this->getJson('/api/v1/lazsip/campaigns/'.$id)->assertJsonPath('data.targetAmount',0);
    }
    foreach ([-1,1.5,2147483648] as $target) $this->putJson('/api/v1/lazsip/campaigns/'.$id,[...$input,'targetAmount'=>$target])->assertUnprocessable();
    $this->assertDatabaseHas('lazsip_campaigns',['id'=>$id,'target_amount'=>0,'current_amount'=>0]);
});
