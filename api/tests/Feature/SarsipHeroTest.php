<?php

use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    DB::table('modules')->insert(['id' => 'hero-sarsip', 'slug' => 'sarsip', 'name' => 'SARSIP', 'is_active' => true]);
});

function sarsipHeroUser(bool $admin = true): void
{
    $user = new User;
    $user->forceFill(['name' => 'Hero editor', 'email' => 'hero@example.test', 'password_hash' => bcrypt('test-password'),
        'is_active' => true, 'is_superadmin' => $admin])->save();
    Sanctum::actingAs($user);
}

function sarsipHeroInput(array $extra = []): array
{
    return [...['headline' => 'Bersama bergerak', 'description' => 'Profil tim SARSIP', 'contact' => ''], ...$extra];
}

it('returns an explicit public profile with no saved hero photo by default', function () {
    $this->getJson('/api/v1/sarsip/profile')->assertOk()->assertJsonPath('data.heroImage', null)
        ->assertJsonStructure(['data' => ['id', 'headline', 'description', 'contact', 'heroImage']]);
    $this->assertDatabaseCount('sarsip_profiles', 0);
});

it('uploads saves replaces and clears the hero photo without removing shared files', function () {
    sarsipHeroUser();
    Storage::fake('public');
    $photo = UploadedFile::fake()->createWithContent('hero.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
    $url = $this->post('/api/v1/sarsip/upload', ['file' => $photo], ['Accept' => 'application/json'])
        ->assertCreated()->json('url');
    Storage::disk('public')->assertExists(ltrim($url, '/'));

    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput(['heroImage' => $url]))->assertOk();
    $this->getJson('/api/v1/sarsip/profile')->assertExactJson(['data' => [
        'id' => 'main', 'headline' => 'Bersama bergerak', 'description' => 'Profil tim SARSIP', 'contact' => null, 'heroImage' => $url,
    ]]);
    $this->assertDatabaseHas('sarsip_profiles', ['id' => 'main', 'hero_image' => $url]);

    // An older editor must not erase a photo by omitting the new field.
    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput(['headline' => 'Judul baru']))->assertOk();
    $this->getJson('/api/v1/sarsip/profile')->assertJsonPath('data.heroImage', $url);

    $replacement = '/uploads/sarsip/12345678-1234-1234-1234-123456789012.webp';
    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput(['heroImage' => $replacement]))->assertOk();
    $this->getJson('/api/v1/sarsip/profile')->assertJsonPath('data.heroImage', $replacement);
    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput(['heroImage' => null]))->assertOk();
    $this->getJson('/api/v1/sarsip/profile')->assertJsonPath('data.heroImage', null);
    Storage::disk('public')->assertExists(ltrim($url, '/'));
});

it('rejects invalid hero image references', function (mixed $image) {
    sarsipHeroUser();
    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput(['heroImage' => $image]))
        ->assertUnprocessable()->assertJsonStructure(['error' => ['details' => ['heroImage']]]);
})->with([
    'script' => ['javascript:alert(1)'],
    'remote URL' => ['https://example.test/photo.jpg'],
    'another module' => ['/uploads/sip/12345678-1234-1234-1234-123456789012.jpg'],
    'document' => ['/uploads/sarsip/12345678-1234-1234-1234-123456789012.pdf'],
    'structured value' => [['url' => 'invalid']],
]);

it('requires authentication and SARSIP access for uploads and profile changes', function () {
    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput())->assertUnauthorized();
    $this->postJson('/api/v1/sarsip/upload')->assertUnauthorized();
    sarsipHeroUser(false);
    $this->putJson('/api/v1/sarsip/profile', sarsipHeroInput())->assertForbidden();
    $this->postJson('/api/v1/sarsip/upload')->assertForbidden();
});

it('rejects documents disguised as hero images', function () {
    sarsipHeroUser();
    Storage::fake('public');
    $this->post('/api/v1/sarsip/upload', ['file' => UploadedFile::fake()->create('hero.png', 1, 'application/pdf')],
        ['Accept' => 'application/json'])->assertUnprocessable();
    expect(Storage::disk('public')->allFiles())->toBe([]);
});
