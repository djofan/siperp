<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function beneficiaryPhotoInput(): array
{
    return ['name' => 'Penerima pengujian', 'address' => 'Alamat privat', 'problemFaced' => 'Kebutuhan pendidikan',
        'birthDate' => '1990-01-01', 'age' => 36, 'gender' => 'perempuan', 'referralSource' => 'Relawan',
        'photo' => '/uploads/lazsip/face.jpg', 'needs' => 'Perlengkapan sekolah', 'aidType' => 'pendidikan',
        'amountReceived' => 100000, 'verifierName' => 'Verifikator', 'verifierArea' => 'Wilayah pengujian',
        'maritalStatus' => 'menikah', 'isPinned' => false, 'nik' => 'private-nik'];
}

it('saves supporting photos separately and exposes them only in public detail', function () {
    $this->withoutMiddleware();
    Storage::fake('public');
    $photos = [];
    foreach (['handoverPhoto', 'certificatePhoto'] as $field) {
        $photos[$field] = $this->post('/api/v1/lazsip/upload', ['file' => UploadedFile::fake()->image($field.'.png')], ['Accept' => 'application/json'])
            ->assertCreated()->json('url');
        Storage::disk('public')->assertExists(substr($photos[$field], 1));
    }
    $input = [...beneficiaryPhotoInput(), ...$photos];
    $id = $this->postJson('/api/v1/lazsip/beneficiaries', $input)->assertCreated()->json('id');
    $this->assertDatabaseHas('lazsip_beneficiaries', ['id' => $id, 'photo' => $input['photo'],
        'handover_photo' => $photos['handoverPhoto'], 'certificate_photo' => $photos['certificatePhoto']]);
    $detail = $this->getJson('/api/v1/lazsip/beneficiaries/'.$id)->assertOk()
        ->assertJsonPath('data.handoverPhoto', $photos['handoverPhoto'])
        ->assertJsonPath('data.certificatePhoto', $photos['certificatePhoto']);
    expect($detail->json('data'))->not->toHaveKeys(['nik', 'address', 'birthDate']);
    $card = $this->getJson('/api/v1/lazsip/beneficiaries')->assertOk()->json('data.0');
    expect($card)->not->toHaveKeys(['handoverPhoto', 'certificatePhoto', 'nik']);
    $this->putJson('/api/v1/lazsip/beneficiaries/'.$id, beneficiaryPhotoInput())->assertOk();
    $this->getJson('/api/v1/lazsip/admin/beneficiaries/'.$id)->assertOk()->assertJsonPath('data.certificatePhoto', $photos['certificatePhoto']);
    $this->putJson('/api/v1/lazsip/beneficiaries/'.$id, [...$input, 'handoverPhoto' => null])->assertOk();
    $this->assertDatabaseHas('lazsip_beneficiaries', ['id' => $id, 'handover_photo' => null, 'certificate_photo' => $photos['certificatePhoto']]);
});

it('supports old records without documentation and validates image references', function () {
    $this->withoutMiddleware();
    $id = $this->postJson('/api/v1/lazsip/beneficiaries', beneficiaryPhotoInput())->assertCreated()->json('id');
    $this->getJson('/api/v1/lazsip/beneficiaries/'.$id)->assertOk()
        ->assertJsonPath('data.handoverPhoto', null)->assertJsonPath('data.certificatePhoto', null);
    $this->putJson('/api/v1/lazsip/beneficiaries/'.$id, [...beneficiaryPhotoInput(), 'certificatePhoto' => str_repeat('a', 192)])
        ->assertUnprocessable();
});
