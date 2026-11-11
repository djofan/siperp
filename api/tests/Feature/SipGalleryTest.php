<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware([
        Illuminate\Auth\Middleware\Authenticate::class,
        App\Modules\Core\Http\Middleware\RequireActiveUser::class,
        App\Modules\Core\Http\Middleware\RequireModuleAccess::class,
        App\Modules\Core\Http\Middleware\RequirePublicModule::class,
    ]);
});

function sipGalleryInput(string $resource): array
{
    return match ($resource) {
        'news' => ['title' => 'Kabar kegiatan', 'content' => 'Kegiatan di lapangan', 'status' => 'published', 'isPinned' => false],
        'program-bantuan' => ['title' => 'Program kesehatan', 'description' => 'Pendampingan kesehatan', 'slug' => 'kesehatan', 'isPinned' => false],
        default => ['title' => 'Penyaluran kesehatan', 'description' => 'Bantuan pengobatan', 'date' => '2026-11-11'],
    };
}

it('saves ordered galleries on SIP content and preserves them when omitted on update', function (string $resource) {
    $photos = array_map(fn ($caption) => ['id' => (string) Str::uuid(), 'image' => '/uploads/sip/'.Str::uuid().'.webp', 'caption' => $caption], ['Foto pertama', 'Foto kedua']);
    $input = sipGalleryInput($resource);
    $id = $this->postJson('/api/v1/sip/'.$resource, $input + ['documentationPhotos' => $photos])->assertCreated()->json('id');
    $this->getJson('/api/v1/sip/'.$resource.'/'.$id)->assertOk()->assertJsonPath('data.documentationPhotos', $photos);
    $this->putJson('/api/v1/sip/'.$resource.'/'.$id, $input)->assertOk()->assertJsonPath('data.documentationPhotos', $photos);
    $this->putJson('/api/v1/sip/'.$resource.'/'.$id, $input + ['documentationPhotos' => array_reverse($photos)])->assertOk()->assertJsonPath('data.documentationPhotos.0.caption', 'Foto kedua');
    $this->putJson('/api/v1/sip/'.$resource.'/'.$id, $input + ['documentationPhotos' => []])->assertOk()->assertJsonPath('data.documentationPhotos', []);
})->with(['news', 'program-bantuan', 'penyaluran-bantuan']);

it('rejects unsafe URLs duplicate identifiers and oversized SIP galleries', function () {
    $photo = ['id' => (string) Str::uuid(), 'image' => 'javascript:alert(1)', 'caption' => 'Foto'];
    $input = sipGalleryInput('program-bantuan');
    $this->postJson('/api/v1/sip/program-bantuan', $input + ['documentationPhotos' => [$photo]])->assertUnprocessable();
    $photo['image'] = '/uploads/sip/'.Str::uuid().'.jpg';
    $this->postJson('/api/v1/sip/program-bantuan', $input + ['documentationPhotos' => [$photo, $photo]])->assertUnprocessable();
    $this->postJson('/api/v1/sip/program-bantuan', $input + ['documentationPhotos' => array_fill(0, 51, $photo)])->assertUnprocessable();
});

it('does not publish galleries belonging to draft news', function () {
    $input = sipGalleryInput('news');
    $input['status'] = 'draft';
    $id = $this->postJson('/api/v1/sip/news', $input + ['documentationPhotos' => [['id' => (string) Str::uuid(), 'image' => '/uploads/sip/'.Str::uuid().'.png']]])->assertCreated()->json('id');
    $this->getJson('/api/v1/sip/news/'.$id)->assertNotFound();
});
