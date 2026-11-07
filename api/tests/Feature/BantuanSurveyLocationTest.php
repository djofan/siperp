<?php

use App\Modules\Bantuan\Models\Application;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);
beforeEach(fn () => config(['bantuan.location_provider' => 'legacy']));

function surveyLocationActor(string $role): User {
    $user = new User;
    $user->forceFill(['name' => 'Survey test', 'email' => Str::uuid().'@example.test', 'password_hash' => 'unused', 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => $role]);
    return $user;
}

function surveyLocationApplication(User $creator): Application {
    $row = new Application;
    $row->forceFill(['id' => (string) Str::uuid(), 'number' => 'B-'.Str::uuid(), 'name' => 'Private name',
        'nik_hash' => hash('sha256', Str::uuid()), 'applicant' => ['name' => 'Private name', 'nik' => '3271051234567890', 'street' => 'Jalan Test', 'city' => 'Bogor'],
        'program' => 'Kebutuhan Pokok', 'region' => 'Bogor', 'source' => 'online', 'intake_role' => 'call_center',
        'status' => 'survey_assigned', 'created_by' => $creator->id, 'version' => 1])->save();
    return $row;
}

it('geocodes the stored address without identity and caches repeated lookups', function () {
    $actor = surveyLocationActor('call_center'); $row = surveyLocationApplication($actor);
    $this->actingAs($actor, 'sanctum');
    Http::fake(['*' => Http::response([['lat' => '-6.59', 'lon' => '106.8', 'display_name' => 'Jalan Test, Bogor']])]);
    $url = '/api/v1/bantuan/applications/'.$row->id.'/locations';
    $this->postJson($url)->assertOk()->assertJsonPath('data.0.latitude', -6.59);
    $this->postJson($url)->assertOk();
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => ($request['q'] ?? null) === 'Jalan Test, Bogor' && !str_contains($request->url(), '327105'));
    expect($row->fresh()->version)->toBe(1);
});

it('does not geocode another verifiers application or allow a distributor to search', function () {
    $owner = surveyLocationActor('call_center'); $row = surveyLocationApplication($owner);
    Http::fake();
    $this->actingAs(surveyLocationActor('verifier'), 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/locations')->assertNotFound();
    $this->actingAs(surveyLocationActor('volunteer'), 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/locations')->assertForbidden();
    Http::assertNothingSent();
});

it('accepts a custom starting address and preserves ambiguous matches', function () {
    $actor = surveyLocationActor('call_center'); $row = surveyLocationApplication($actor);
    Http::fake(['*' => Http::response([['lat' => '-6', 'lon' => '106', 'display_name' => 'A'], ['lat' => '-7', 'lon' => '107', 'display_name' => 'B']])]);
    $this->actingAs($actor, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/locations', ['origin' => 'Kantor Bogor'])->assertOk()->assertJsonCount(2, 'data');
    Http::assertSent(fn ($request) => ($request['q'] ?? null) === 'Kantor Bogor');
});

it('allows only the assigned verifier even when another verifier created the application', function () {
    $creator = surveyLocationActor('verifier'); $assigned = surveyLocationActor('verifier');
    $row = surveyLocationApplication($creator);
    $row->forceFill(['verifier_id' => $assigned->id])->save();
    Http::fake(['*' => Http::response([['lat' => '-6', 'lon' => '106', 'display_name' => 'Bogor']])]);
    $url = '/api/v1/bantuan/applications/'.$row->id.'/locations';
    $this->actingAs($creator, 'sanctum')->postJson($url)->assertForbidden();
    Http::assertNothingSent();
    $this->actingAs($assigned, 'sanctum')->postJson($url)->assertOk();
});

it('handles upstream failures without reporting a false destination', function () {
    $actor = surveyLocationActor('call_center'); $row = surveyLocationApplication($actor);
    Http::fake(['*' => Http::response([], 503)]);
    $this->actingAs($actor, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/locations')->assertStatus(503);
});

it('throttles outbound requests globally and filters invalid coordinates', function () {
    $actor = surveyLocationActor('call_center'); $row = surveyLocationApplication($actor);
    Http::fake(['*' => Http::response([['lat' => '999', 'lon' => '106'], ['lat' => '-6', 'lon' => '106', 'display_name' => 'Valid']])]);
    $this->actingAs($actor, 'sanctum'); $url = '/api/v1/bantuan/applications/'.$row->id.'/locations';
    $this->postJson($url)->assertOk()->assertJsonCount(1, 'data');
    $lock = \Illuminate\Support\Facades\Cache::lock('bantuan:geocode:outbound', 20);
    $lock->get();
    $this->postJson($url, ['origin' => 'Different location'])->assertStatus(429);
    $lock->release();
    Http::assertSentCount(1);
});

it('simplifies Indonesian address details and labels area-only fallback', function () {
    Http::fakeSequence()->push([])->push([])->push([])->push([])->push([])->push([['lat' => '-6.5', 'lon' => '106.8', 'display_name' => 'Nanggewer, Cibinong, Bogor']]);
    $results = app(\App\Modules\Bantuan\Services\SurveyGeocoder::class)->search('Bogor Asri, Perumahan Jl. Roda Pembangunan, RT.02/RW.011, Nanggewer, Kec. Cibinong, Kabupaten Bogor, Jawa Barat 16912');
    expect($results[0]['approximate'])->toBeTrue();
    Http::assertSent(fn ($request) => ($request['q'] ?? null) === 'Nanggewer, Cibinong, Bogor, Jawa Barat');
    Http::assertNotSent(fn ($request) => str_contains($request['q'] ?? '', 'RT.02') || str_contains($request['q'] ?? '', '16912'));
});

it('returns validated road geometry and caches the route', function () {
    $actor = surveyLocationActor('call_center'); $row = surveyLocationApplication($actor);
    $this->actingAs($actor, 'sanctum');
    $payload = ['origin' => ['latitude' => -6.5, 'longitude' => 106.8], 'destination' => ['latitude' => -6.51, 'longitude' => 106.81]];
    Http::fake(['*' => Http::response(['code' => 'Ok', 'routes' => [['distance' => 1800, 'duration' => 300, 'geometry' => ['type' => 'LineString', 'coordinates' => [[106.8,-6.5],[106.805,-6.5],[106.81,-6.51]]]]]])]);
    $url = '/api/v1/bantuan/applications/'.$row->id.'/route';
    $this->postJson($url, $payload)->assertOk()->assertJsonPath('data.distance', 1800)->assertJsonCount(3, 'data.coordinates');
    $this->postJson($url, $payload)->assertOk();
    Http::assertSentCount(1);
    $this->actingAs(surveyLocationActor('verifier'), 'sanctum')->postJson($url, $payload)->assertNotFound();
});

it('does not invent a road route when the provider has no route', function () {
    $actor = surveyLocationActor('call_center'); $row = surveyLocationApplication($actor);
    Http::fake(['*' => Http::response(['code' => 'NoRoute'])]);
    $this->actingAs($actor, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/route', ['origin' => ['latitude' => -6.5, 'longitude' => 106.8], 'destination' => ['latitude' => -6.51, 'longitude' => 106.81]])->assertStatus(503);
});

it('requires a separate survey address and clears only the survey pin when it changes', function () {
    $cc = surveyLocationActor('call_center'); $verifier = surveyLocationActor('verifier');
    $row = surveyLocationApplication($cc);
    $this->actingAs($cc, 'sanctum');
    $url = '/api/v1/bantuan/applications/'.$row->id.'/actions/assign_survey';
    $this->postJson($url, ['version' => 1, 'verifierId' => $verifier->id])->assertUnprocessable();
    expect($row->fresh()->version)->toBe(1);
    $payload = ['version' => 1, 'verifierId' => $verifier->id, 'surveyAddress' => 'Jalan Kunjungan Baru 15, Bogor'];
    $this->postJson($url, $payload)->assertOk();
    $row->refresh();
    expect($row->survey_location['address'])->toBe($payload['surveyAddress'])->and($row->applicant['street'])->toBe('Jalan Test');
    expect(DB::table('bantuan_applications')->where('id', $row->id)->value('survey_location'))->not->toContain('Kunjungan');
    $row->forceFill(['survey_location' => [...$row->survey_location, 'latitude' => -6.2, 'longitude' => 106.8]])->save();
    $this->postJson($url, [...$payload, 'version' => 2, 'surveyAddress' => 'Jalan Kunjungan Lain 20, Bogor'])->assertOk();
    expect($row->fresh()->survey_location)->toBe(['address' => 'Jalan Kunjungan Lain 20, Bogor']);
    Http::fake(['*' => Http::response([['lat' => '-6', 'lon' => '106', 'display_name' => 'Tujuan survei']])]);
    $this->actingAs($verifier, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/locations')->assertOk();
    Http::assertSent(fn ($request) => ($request['q'] ?? null) === 'Jalan Kunjungan Lain 20, Bogor');
});

it('lets call center correct assigned survey address without changing assignment or applicant', function () {
    $cc = surveyLocationActor('call_center'); $verifier = surveyLocationActor('verifier');
    $row = surveyLocationApplication($cc);
    $row->forceFill(['status' => 'survey_assigned', 'verifier_id' => $verifier->id, 'survey_location' => ['address' => 'Alamat survei lama Bogor', 'latitude' => -6.5, 'longitude' => 106.8]])->save();
    $url = '/api/v1/bantuan/applications/'.$row->id.'/actions/survey_address';
    $this->actingAs($verifier, 'sanctum')->postJson($url, ['version' => 1, 'surveyAddress' => 'Alamat baru di Bogor'])->assertForbidden();
    $this->actingAs($cc, 'sanctum')->postJson($url, ['version' => 1, 'surveyAddress' => ''])->assertUnprocessable();
    $this->postJson($url, ['version' => 1, 'surveyAddress' => 'Alamat baru di Bogor'])->assertOk();
    $row->refresh();
    expect($row->status)->toBe('survey_assigned')->and($row->verifier_id)->toBe($verifier->id)
        ->and($row->survey_location)->toBe(['address' => 'Alamat baru di Bogor'])
        ->and($row->applicant['street'])->toBe('Jalan Test');
    $this->assertDatabaseHas('bantuan_notifications', ['application_id' => $row->id, 'user_id' => $verifier->id, 'message' => $row->number.' · Alamat kunjungan survei diperbarui']);
    $this->postJson($url, ['version' => 1, 'surveyAddress' => 'Alamat lain di Bogor'])->assertConflict();
});


it('offers a named landmark when the full street address cannot be found', function () {
    Http::fakeSequence()->push([])->push([])->push([['lat' => '-6.5983048', 'lon' => '106.7994229', 'display_name' => 'Kebun Raya Bogor, Bogor Tengah, Bogor']]);
    $results = app(\App\Modules\Bantuan\Services\SurveyGeocoder::class)->search('Kebun Raya Bogor, Jalan Ir. H. Juanda No. 13, Paledang, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16122.');
    expect($results[0]['approximate'])->toBeTrue()->and($results[0]['latitude'])->toBe(-6.5983048);
    Http::assertSent(fn ($request) => ($request['street'] ?? null) === 'Kebun Raya Bogor');
    Http::assertSentCount(3);
});


it('uses simplified street and postcode before retrying without postcode', function () {
    Http::fakeSequence()->push([])->push([])->push([['lat' => '-6.5', 'lon' => '106.8', 'display_name' => 'Jalan Roda Pembangunan, Bogor']]);
    $results = app(\App\Modules\Bantuan\Services\SurveyGeocoder::class)->search('Jl. Roda Pembangunan No. 12 Blok AB RT.01/RW.011, Nanggewer, Bogor 16912');
    expect($results[0]['approximate'])->toBeTrue();
    Http::assertSent(fn ($request) => ($request['street'] ?? null) === 'Jalan Roda Pembangunan' && ($request['postalcode'] ?? null) === '16912' && !isset($request['q']));
    Http::assertSent(fn ($request) => ($request['street'] ?? null) === 'Jalan Roda Pembangunan' && !isset($request['postalcode']) && !isset($request['q']));
});

it('notifies both old and new verifiers when survey assignment changes', function () {
    $cc = surveyLocationActor('call_center'); $old = surveyLocationActor('verifier'); $new = surveyLocationActor('verifier');
    $row = surveyLocationApplication($cc);
    $row->forceFill(['verifier_id' => $old->id])->save();
    $this->actingAs($cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/actions/assign_survey', ['version' => 1, 'verifierId' => $new->id, 'surveyAddress' => 'Jalan survei Bogor'])->assertOk();
    $this->assertDatabaseHas('bantuan_notifications', ['application_id' => $row->id, 'user_id' => $old->id, 'message' => $row->number.' · Tugas survei Anda dialihkan ke petugas lain']);
    $this->assertDatabaseHas('bantuan_notifications', ['application_id' => $row->id, 'user_id' => $new->id, 'message' => $row->number.' · Anda mendapat tugas survei']);
});

it('allows non-field roles to monitor ongoing applications without exposing drafts or allowing mutations', function () {
    $cc = surveyLocationActor('call_center'); $requester = surveyLocationActor('requester');
    $active = surveyLocationApplication($cc);
    $draft = surveyLocationApplication($cc); $draft->forceFill(['status' => 'draft'])->save();
    $done = surveyLocationApplication($cc); $done->forceFill(['status' => 'completed'])->save();
    $this->actingAs($requester, 'sanctum')->getJson('/api/v1/bantuan/applications?view=ongoing')->assertOk()->assertJsonCount(0, 'data');
    $own = surveyLocationApplication($requester);
    $this->getJson('/api/v1/bantuan/applications?view=ongoing')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own->id);
    $this->actingAs(surveyLocationActor('treasurer'), 'sanctum')->getJson('/api/v1/bantuan/applications?view=ongoing')->assertOk()->assertJsonCount(2, 'data');
    $this->actingAs($requester, 'sanctum');
    $this->postJson('/api/v1/bantuan/applications/'.$active->id.'/actions/cancel', ['version' => 1, 'reason' => 'Tidak berwenang'])->assertNotFound();
    $this->getJson('/api/v1/bantuan/applications?view=ongoing&status=completed')->assertOk()->assertJsonCount(0, 'data');
    foreach (['verifier', 'volunteer'] as $role) {
        $this->actingAs(surveyLocationActor($role), 'sanctum')->getJson('/api/v1/bantuan/applications?view=ongoing')->assertForbidden();
    }
});

it('marks only the current accounts notifications read', function () {
    $actor = surveyLocationActor('call_center'); $other = surveyLocationActor('verifier');
    $row = surveyLocationApplication($actor);
    foreach ([$actor, $other] as $user) DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'application_id' => $row->id, 'user_id' => $user->id, 'message' => 'Test', 'created_at' => now()]);
    $this->actingAs($actor, 'sanctum')->putJson('/api/v1/bantuan/notifications/read-all')->assertOk();
    expect(DB::table('bantuan_notifications')->where('user_id', $actor->id)->whereNull('read_at')->count())->toBe(0);
    expect(DB::table('bantuan_notifications')->where('user_id', $other->id)->whereNull('read_at')->count())->toBe(1);
});

it('does not broadcast an assignment to unrelated admins or its actor', function () {
    $cc = surveyLocationActor('call_center'); $verifier = surveyLocationActor('verifier'); $admin = surveyLocationActor('admin'); $other = surveyLocationActor('verifier');
    $row = surveyLocationApplication($cc);
    $this->actingAs($cc, 'sanctum')->postJson('/api/v1/bantuan/applications/'.$row->id.'/actions/assign_survey', ['version' => 1, 'verifierId' => $verifier->id, 'surveyAddress' => 'Alamat survei di Bogor'])->assertOk();
    expect(DB::table('bantuan_notifications')->where('application_id', $row->id)->pluck('user_id')->all())->toBe([$verifier->id]);
});
