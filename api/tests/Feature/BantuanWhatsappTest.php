<?php

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Services\Journal;
use App\Modules\Bantuan\Services\Reminders;
use App\Modules\Bantuan\Services\Whatsapp;
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function waMember(string $role = 'verifier'): User
{
    $user = new User;
    $user->forceFill(['name' => 'Internal Person', 'email' => Str::uuid().'@example.test', 'password_hash' => 'unused-test', 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id,
        'module_id' => DB::table('modules')->where('slug', 'bantuan')->value('id'), 'role' => $role]);
    DB::table('bantuan_staff')->insert(['user_id' => $user->id, 'roles' => json_encode([$role]), 'phone' => Crypt::encryptString('628123456789'), 'whatsapp_enabled' => true]);
    return $user;
}

function waApplication(User $user, string $status = 'survey_assigned'): Application
{
    $row = new Application;
    $row->forceFill(['id' => (string) Str::uuid(), 'number' => 'BNT-TEST-'.Str::random(6),
        'name' => 'PRIVATE APPLICANT', 'nik_hash' => hash('sha256', Str::uuid()), 'applicant' => ['name' => 'PRIVATE APPLICANT', 'phone' => '081999999999'],
        'program' => 'Test', 'region' => 'Test', 'source' => 'online', 'status' => $status,
        'created_by' => $user->id, 'verifier_id' => $user->id, 'distributor_id' => $user->id, 'distribution_type' => 'verifier'])->save();
    return $row;
}

function waNotify(Application $row, User $user, ?string $dedup = null): void
{
    app(Journal::class)->notify($row, 'assign_survey', [], [$user->id], $dedup);
}

function waFake(mixed $response): void
{
    // A second Http::fake appends callbacks in Laravel 13; reset to avoid consuming
    // a response sequence behind the previous default-success callback.
    Http::swap(new \Illuminate\Http\Client\Factory);
    Http::preventStrayRequests();
    Http::fake(['api.fonnte.com/send' => $response]);
}

beforeEach(function () {
    waFake(Http::response(['status' => true, 'id' => ['provider-id']]));
    config(['bantuan.whatsapp_enabled' => true, 'bantuan.fonnte_token' => 'fake-test-token', 'bantuan.public_url' => 'https://bantuan.example.org']);
});

it('enqueues transactionally then sends polite task details and link once without private contact data', function () {
    $user = waMember();
    $row = waApplication($user);
    waNotify($row, $user, 'same-event');
    waNotify($row, $user, 'same-event');
    Http::assertNothingSent();
    expect(DB::table('bantuan_whatsapp_outbox')->count())->toBe(1);
    expect(app(Whatsapp::class)->process())->toBe(1)->and(app(Whatsapp::class)->process())->toBe(0);
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request->url() === 'https://api.fonnte.com/send'
        && $request->hasHeader('Authorization', 'fake-test-token')
        && $request['target'] === '628123456789' && $request['countryCode'] === '0'
        && str_contains($request['message'], $row->number)
        && str_contains($request['message'], 'https://bantuan.example.org/admin/bantuan/pengajuan/'.$row->id)
        && str_contains($request['message'], 'Yth. Bapak/Ibu') && str_contains($request['message'], $row->name)
        && ! str_contains($request['message'], '081999999999'));
});

it('rolls back the outbox with the workflow transaction', function () {
    $user = waMember(); $row = waApplication($user);
    DB::beginTransaction();
    waNotify($row, $user);
    DB::rollBack();
    expect(DB::table('bantuan_whatsapp_outbox')->count())->toBe(0);
    Http::assertNothingSent();
});

it('keeps FYI and final notifications internal without creating duplicate WhatsApp tasks', function (string $action) {
    $user = waMember(); $row = waApplication($user);
    app(Journal::class)->notify($row, $action, [], [$user->id]);
    expect(DB::table('bantuan_notifications')->count())->toBe(1)
        ->and(DB::table('bantuan_whatsapp_outbox')->count())->toBe(0);
    Http::assertNothingSent();
})->with(['comment', 'survey_save', 'survey_review_save', 'survey_location', 'handover', 'cancel', 'return_funds', 'FYI']);

it('keeps reassignment return and reminder task events eligible before label translation', function (string $action) {
    $user = waMember(); $row = waApplication($user);
    app(Journal::class)->notify($row, $action, [], [$user->id], reason: 'PRIVATE REASON must stay internal');
    expect(DB::table('bantuan_whatsapp_outbox')->count())->toBe(1);
    Http::assertNothingSent();
    app(Whatsapp::class)->process();
    Http::assertSent(fn ($request) => ! str_contains($request['message'], 'PRIVATE REASON'));
})->with(['assign_survey', 'survey_return', 'survey_again', 'Pengingat: Selesaikan survei']);

it('does not enqueue or send when disabled or missing required configuration', function (string $key, mixed $value) {
    config([$key => $value]);
    $user = waMember(); waNotify(waApplication($user), $user);
    expect(app(Whatsapp::class)->process())->toBe(0)->and(DB::table('bantuan_whatsapp_outbox')->count())->toBe(0);
    Http::assertNothingSent();
})->with([
    ['bantuan.whatsapp_enabled', false], ['bantuan.fonnte_token', ''], ['bantuan.public_url', 'http://bantuan.example.org'],
    ['bantuan.public_url', 'https://localhost'], ['bantuan.public_url', 'https://127.0.0.1'], ['bantuan.public_url', 'https://192.168.1.1'],
]);

it('leaves pending messages untouched while disabled', function () {
    $user = waMember(); waNotify(waApplication($user), $user);
    config(['bantuan.whatsapp_enabled' => false]);
    expect(app(Whatsapp::class)->process())->toBe(0)->and(DB::table('bantuan_whatsapp_outbox')->value('attempts'))->toBe(0);
    Http::assertNothingSent();
});

it('revalidates current membership assignment optin and actionable stage', function (string $change) {
    $user = waMember(); $row = waApplication($user); waNotify($row, $user);
    match ($change) {
        'membership' => DB::table('module_access')->where('user_id', $user->id)->delete(),
        'inactive' => DB::table('users')->where('id', $user->id)->update(['is_active' => false]),
        'role' => DB::table('module_access')->where('user_id', $user->id)->update(['role' => 'requester']),
        'assignment' => DB::table('bantuan_applications')->where('id', $row->id)->update(['verifier_id' => 'someone-else']),
        'completed' => DB::table('bantuan_applications')->where('id', $row->id)->update(['status' => 'completed']),
        'stage' => DB::table('bantuan_applications')->where('id', $row->id)->update(['status' => 'screening']),
        'optout' => DB::table('bantuan_staff')->where('user_id', $user->id)->update(['whatsapp_enabled' => false]),
        'phone' => DB::table('bantuan_staff')->where('user_id', $user->id)->update(['phone' => 'plaintext-invalid']),
    };
    expect(app(Whatsapp::class)->process())->toBe(0)->and(DB::table('bantuan_whatsapp_outbox')->value('status'))->toBe('skipped');
    Http::assertNothingSent();
})->with(['membership', 'inactive', 'role', 'assignment', 'completed', 'stage', 'optout', 'phone']);

it('retries explicit refusal with backoff and stops after three attempts', function () {
    waFake(Http::response(['status' => false, 'reason' => 'PII must never be stored']));
    $user = waMember(); waNotify(waApplication($user), $user);
    $service = app(Whatsapp::class);
    $service->process(); $service->process();
    Http::assertSentCount(1);
    $this->travel(6)->minutes(); $service->process();
    $this->travel(11)->minutes(); $service->process();
    $this->travel(20)->minutes(); $service->process();
    Http::assertSentCount(3);
    $item = DB::table('bantuan_whatsapp_outbox')->first();
    expect($item->status)->toBe('failed')->and($item->attempts)->toBe(3)->and($item->last_error)->toBe('provider_rejected');
});

it('retries a rejected attempt successfully without a second accepted send', function () {
    waFake(Http::sequence()->push(['status' => false])->push(['status' => true]));
    $user = waMember(); waNotify(waApplication($user), $user);
    app(Whatsapp::class)->process(); $this->travel(6)->minutes();
    expect(app(Whatsapp::class)->process())->toBe(1)->and(app(Whatsapp::class)->process())->toBe(0);
    Http::assertSentCount(2);
});

it('does not replay ambiguous failures or abandoned claims', function () {
    waFake(Http::failedConnection());
    $user = waMember(); $row = waApplication($user); waNotify($row, $user);
    app(Whatsapp::class)->process(); app(Whatsapp::class)->process();
    expect(DB::table('bantuan_whatsapp_outbox')->value('last_error'))->toBe('delivery_unknown');
    waNotify($row, $user);
    DB::table('bantuan_whatsapp_outbox')->where('status', 'pending')->update(['status' => 'processing', 'claimed_at' => now()->subMinutes(6)]);
    app(Whatsapp::class)->process();
    expect(DB::table('bantuan_whatsapp_outbox')->where('status', 'failed')->count())->toBe(2);
});

it('encrypts staff phones exposes them only to admins and preserves omitted phone fields', function () {
    $admin = waMember('admin'); $user = waMember();
    $payload = ['roles' => ['verifier'], 'canBypass' => false, 'active' => true, 'phone' => '0812 3456 789', 'whatsappEnabled' => true];
    $this->actingAs($admin, 'sanctum')->putJson('/api/v1/bantuan/staff/'.$user->id, $payload)->assertOk();
    $encrypted = DB::table('bantuan_staff')->where('user_id', $user->id)->value('phone');
    expect($encrypted)->not->toBe('628123456789')->and(Crypt::decryptString($encrypted))->toBe('628123456789');
    $people = $this->getJson('/api/v1/bantuan/staff')->assertOk()->json('data');
    expect(collect($people)->firstWhere('id', $user->id)['phone'])->toBe('628123456789');
    $this->putJson('/api/v1/bantuan/staff/'.$user->id, ['roles' => ['verifier'], 'canBypass' => false, 'active' => true])->assertOk();
    expect(Whatsapp::phone(DB::table('bantuan_staff')->where('user_id', $user->id)->value('phone')))->toBe('628123456789');
    $this->actingAs($user, 'sanctum')->getJson('/api/v1/bantuan/staff')->assertOk()->assertJsonMissingPath('data.0.phone')->assertJsonMissingPath('data.0.encryptedPhone')->assertJsonMissingPath('data.0.whatsappEnabled');
    $this->getJson('/api/v1/bantuan/whatsapp/status')->assertForbidden();
    $this->actingAs($admin, 'sanctum')->getJson('/api/v1/bantuan/whatsapp/status')->assertOk()->assertJsonPath('data.configured', true);
});

it('rejects multiple targets and optin without a phone', function () {
    $admin = waMember('admin'); $user = waMember();
    $payload = ['roles' => ['verifier'], 'canBypass' => false, 'active' => true, 'whatsappEnabled' => true];
    foreach (['08123456789,08123456788', '08123456789|Name', ''] as $phone) {
        $this->actingAs($admin, 'sanctum')->putJson('/api/v1/bantuan/staff/'.$user->id, [...$payload, 'phone' => $phone])->assertUnprocessable();
    }
    Http::assertNothingSent();
});

it('reminds other tasks daily without prematurely reminding a new survey assignment', function () {
    $verifier = waMember(); $cc = waMember('call_center');
    waApplication($verifier); waApplication($cc, 'screening');
    app(Reminders::class)->send(); app(Reminders::class)->send();
    expect(DB::table('bantuan_whatsapp_outbox')->count())->toBe(1);
    Http::assertNothingSent();
});
