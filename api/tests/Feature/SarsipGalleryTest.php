<?php

use App\Modules\Core\Models\User;
use App\Modules\Sarsip\Models\SarsipBeneficiary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    DB::table('modules')->insert(['id' => 'gallery-sarsip', 'slug' => 'sarsip', 'name' => 'SARSIP', 'is_active' => true]);
});

function sarsipGalleryAdmin(): void
{
    $user = new User;
    $user->forceFill(['name' => 'Editor', 'email' => 'gallery@example.test', 'password_hash' => bcrypt('test-password'), 'is_active' => true, 'is_superadmin' => true])->save();
    Sanctum::actingAs($user);
}
function sarsipGalleryPhoto(): array
{
    return ['id' => 'photo-1', 'image' => '/uploads/sarsip/12345678-1234-1234-1234-123456789012.jpg', 'caption' => 'Dokumentasi lapangan'];
}

it('round trips gallery, preserves omitted photos and removes references explicitly', function () {
    sarsipGalleryAdmin();
    $input = ['kind' => 'berita', 'title' => 'Kabar tim', 'description' => 'Kegiatan lapangan', 'status' => 'published', 'gallery' => [sarsipGalleryPhoto()]];
    $id = $this->postJson('/api/v1/sarsip/entries', $input)->assertCreated()->json('id');
    $this->getJson("/api/v1/sarsip/entries/{$id}?kind=berita")->assertOk()->assertJsonPath('data.gallery.0.caption', 'Dokumentasi lapangan');
    unset($input['gallery']);
    $this->putJson("/api/v1/sarsip/entries/{$id}", $input)->assertOk();
    $this->getJson("/api/v1/sarsip/entries/{$id}")->assertJsonCount(1, 'data.gallery');
    $this->putJson("/api/v1/sarsip/entries/{$id}", [...$input, 'gallery' => []])->assertOk();
    $this->getJson("/api/v1/sarsip/entries/{$id}")->assertJsonCount(0, 'data.gallery');
});

it('rejects unsafe gallery URLs, duplicate ids and oversized batches', function () {
    sarsipGalleryAdmin();
    $input = ['kind' => 'kegiatan', 'title' => 'Latihan tim', 'description' => 'Dokumentasi', 'status' => 'draft'];
    foreach (['javascript:alert(1)', 'https://evil.test/x.jpg', '/uploads/sip/12345678-1234-1234-1234-123456789012.jpg'] as $url) {
        $this->postJson('/api/v1/sarsip/entries', [...$input, 'gallery' => [[...sarsipGalleryPhoto(), 'image' => $url]]])->assertUnprocessable();
    }
    $this->postJson('/api/v1/sarsip/entries', [...$input, 'gallery' => [sarsipGalleryPhoto(), sarsipGalleryPhoto()]])->assertUnprocessable();
    $this->postJson('/api/v1/sarsip/entries', [...$input, 'gallery' => array_fill(0, 13, sarsipGalleryPhoto())])->assertUnprocessable();
});

it('publishes beneficiary galleries without exposing private fields or unpublished records', function () {
    $row = new SarsipBeneficiary;
    $row->forceFill(['name' => 'Private name', 'phone' => '08123456789', 'location' => 'Private address', 'assistance' => 'Bantuan', 'notes' => 'Private notes', 'publicName' => 'Keluarga A', 'category' => 'Lainnya', 'amount' => 1000, 'receivedAt' => now(), 'isPublished' => true, 'gallery' => [sarsipGalleryPhoto()]])->save();
    $data = $this->getJson('/api/v1/sarsip/beneficiaries')->assertOk()->json('data.0');
    expect($data['gallery'][0]['caption'])->toBe('Dokumentasi lapangan');
    expect(array_keys($data))->not->toContain('name', 'phone', 'location', 'notes');
    $row->isPublished = false;
    $row->save();
    $this->getJson('/api/v1/sarsip/beneficiaries')->assertJsonCount(0, 'data');
});

it('requires authentication for gallery writes', function () {
    $this->postJson('/api/v1/sarsip/entries', ['gallery' => [sarsipGalleryPhoto()]])->assertUnauthorized();
});
