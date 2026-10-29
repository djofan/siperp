<?php

use App\Modules\Core\Models\User;
use App\Modules\Teknisi\Models\ServiceDetail;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use App\Modules\Teknisi\Models\TeknisiTicket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    $user = new User;
    $user->forceFill(['id' => 'workflow-tech-user', 'name' => 'Test technician', 'email' => 'workflow@example.test',
        'password_hash' => 'unused', 'is_active' => true, 'is_superadmin' => false])->save();
    DB::table('modules')->insert(['id' => 'workflow-module', 'slug' => 'teknisi', 'name' => 'Teknisi', 'is_active' => true]);
    DB::table('module_access')->insert(['id' => 'workflow-access', 'user_id' => $user->id, 'module_id' => 'workflow-module', 'role' => 'technician']);
    DB::table('teknisi_outlets')->insert(['id' => 'workflow-outlet', 'name' => 'Outlet test', 'address' => 'Test', 'phone' => '08000000']);
    DB::table('teknisi_technicians')->insert(['id' => 'workflow-tech', 'userId' => $user->id, 'name' => $user->name,
        'outletId' => 'workflow-outlet', 'specialty' => 'Repair', 'isActive' => true, 'active_outlet_id' => 'workflow-outlet']);
    Sanctum::actingAs($user);
});

function workflowNewTicket($test, array $extra = []): string
{
    return $test->post('/api/v1/teknisi/tickets', array_replace([
        'outletId' => 'workflow-outlet', 'serviceType' => 'normal', 'priority' => 'normal',
        'customerName' => 'Test customer', 'customerPhone' => '0810000000', 'device' => 'Test phone',
        'complaint' => 'Tidak bisa mengisi daya', 'estimate' => 200000,
        'beforePhoto' => UploadedFile::fake()->image('before.jpg'),
    ], $extra), ['Accept' => 'application/json'])->assertCreated()->json('data.id');
}

function workflowAdvance($test, string $id, string $operation, array $extra = [])
{
    $ticket = TeknisiTicket::findOrFail($id);

    return $test->post('/api/v1/teknisi/workflow', array_merge([
        'ticketId' => $id, 'operation' => $operation, 'expectedStatus' => $ticket->status,
        'expectedVersion' => $ticket->updatedAt->toISOString(),
    ], $extra), ['Accept' => 'application/json']);
}

it('runs pending to process to ready to finish once, with photos, payment and warranty', function () {
    $id = workflowNewTicket($this);
    expect(TeknisiTicket::find($id)->status)->toBe('received');
    workflowAdvance($this, $id, 'collect')->assertUnprocessable();
    workflowAdvance($this, $id, 'start')->assertOk();
    expect(TeknisiTicket::find($id)->status)->toBe('repairing');
    expect(ServiceDetail::where('ticketId', $id)->first()->startedAt)->not->toBeNull();
    workflowAdvance($this, $id, 'complete', ['diagnosis' => 'Port rusak'])->assertUnprocessable();
    expect(TeknisiTicket::find($id)->status)->toBe('repairing');
    workflowAdvance($this, $id, 'complete', [
        'diagnosis' => 'Port rusak', 'treatment' => 'Perbaikan port', 'replacedParts' => 'Port charger USB-C', 'capital' => 50000,
        'finalPrice' => 180000, 'warrantyDays' => 30, 'afterPhoto' => UploadedFile::fake()->image('after.png'),
    ])->assertOk();
    expect(TeknisiTicket::find($id)->status)->toBe('ready');
    expect(ServiceDetail::where('ticketId', $id)->first()->collectedAt)->toBeNull();
    $this->getJson('/api/v1/teknisi/service-finance')->assertOk()->assertJsonPath('data.revenue', 0);
    $pickup = ['amount' => 180000, 'paymentMethod' => 'transfer', 'receiverName' => 'Penerima',
        'receiverPhone' => '0810000000', 'handoverPhoto' => UploadedFile::fake()->image('handover.jpg')];
    workflowAdvance($this, $id, 'collect', $pickup)->assertUnprocessable();
    workflowAdvance($this, $id, 'collect', array_merge($pickup, ['paymentProof' => UploadedFile::fake()->image('payment.jpg')]))->assertOk();
    $detail = ServiceDetail::where('ticketId', $id)->first();
    expect($detail->collectedAt)->not->toBeNull();
    expect($detail->warrantyUntil->isFuture())->toBeTrue();
    $this->getJson('/api/v1/teknisi/service-finance')->assertOk()->assertJsonPath('data.revenue', 180000)->assertJsonPath('data.profit', 130000);
    $this->getJson('/api/v1/teknisi/tickets/'.$id)->assertOk()->assertJsonCount(4, 'data.ticket.media');
    workflowAdvance($this, $id, 'collect', $pickup)->assertUnprocessable();
    $claim = workflowNewTicket($this, ['serviceType' => 'warranty', 'warrantyParentId' => $id]);
    expect(ServiceDetail::where('ticketId', $claim)->first()->warrantyParentId)->toBe($id);
    expect(TeknisiTicket::find($id)->status)->toBe('collected');
    $this->post('/api/v1/teknisi/tickets', [
        'serviceType' => 'warranty', 'warrantyParentId' => $id, 'outletId' => 'workflow-outlet',
        'beforePhoto' => UploadedFile::fake()->image('duplicate.jpg'),
    ], ['Accept' => 'application/json'])->assertConflict();
    $this->getJson('/api/v1/teknisi/tickets/'.$claim)->assertOk()
        ->assertJsonPath('data.ticket.warranty_source.id', $id)
        ->assertJsonPath('data.ticket.warranty_source.workflow.diagnosis', 'Port rusak')
        ->assertJsonPath('data.ticket.warranty_source.workflow.replacedParts', 'Port charger USB-C')
        ->assertJsonCount(4, 'data.ticket.warranty_source.media');
    workflowAdvance($this, $claim, 'start')->assertOk();
    workflowAdvance($this, $claim, 'complete', [
        'diagnosis' => 'Port perlu disesuaikan', 'treatment' => 'Penyesuaian konektor',
        'replacedParts' => 'Tidak ada', 'capital' => 0, 'warrantyDays' => 0,
        'afterPhoto' => UploadedFile::fake()->image('warranty-after.jpg'),
    ])->assertOk();
    workflowAdvance($this, $claim, 'collect', [
        'receiverName' => 'Penerima garansi', 'receiverPhone' => '0810000000',
        'handoverPhoto' => UploadedFile::fake()->image('warranty-handover.jpg'),
    ])->assertOk();
    $claimDetail = ServiceDetail::where('ticketId', $claim)->first();
    expect($claimDetail->finalPrice)->toBe(0);
    expect($claimDetail->paymentMethod)->toBe('warranty');
    expect(TeknisiTicket::find($claim)->status)->toBe('collected');
    expect(ServiceDetail::where('ticketId', $id)->first()->finalPrice)->toBe(180000);
    $this->getJson('/api/v1/teknisi/service-finance')->assertJsonPath('data.revenue', 180000);
});

it('rejects stale writes and cross outlet access and retains cancelled history', function () {
    $id = workflowNewTicket($this);
    $version = TeknisiTicket::find($id)->updatedAt->toISOString();
    workflowAdvance($this, $id, 'start')->assertOk();
    $this->postJson('/api/v1/teknisi/workflow', ['ticketId' => $id, 'operation' => 'cancel',
        'expectedStatus' => 'received', 'expectedVersion' => $version, 'cancelReason' => 'Stale'])->assertConflict();
    workflowAdvance($this, $id, 'cancel', ['cancelReason' => 'Pelanggan membatalkan'])->assertOk();
    expect(TeknisiTicket::find($id)->status)->toBe('cancelled');
    expect(DB::table('teknisi_events')->where('ticketId', $id)->count())->toBe(3);
    DB::table('teknisi_outlets')->insert(['id' => 'other-outlet', 'name' => 'Other outlet', 'address' => 'Test', 'phone' => '08000001']);
    DB::table('teknisi_tickets')->where('id', $id)->update(['outletId' => 'other-outlet']);
    $this->getJson('/api/v1/teknisi/tickets/'.$id)->assertNotFound();
    $mediaId = DB::table('teknisi_service_media')->where('ticketId', $id)->value('id');
    $this->get('/api/v1/teknisi/media/'.$mediaId, ['Accept' => 'application/json'])->assertNotFound();
});

it('does not allow skipping the required workflow through the legacy status endpoint', function () {
    $id = workflowNewTicket($this);
    $ticket = TeknisiTicket::find($id);
    $this->postJson('/api/v1/teknisi/tickets/update', ['ticketId' => $id, 'status' => 'diagnosis',
        'expectedStatus' => 'received', 'expectedVersion' => $ticket->updatedAt->toISOString(), 'note' => 'Bypass'])->assertConflict();
    expect($ticket->fresh()->status)->toBe('received');
});

it('lets superadmin rename outlets and synchronizes technician and account names', function () {
    $this->patchJson('/api/v1/teknisi/outlets/workflow-outlet', ['name' => 'Forbidden'])->assertForbidden();
    $admin = new User;
    $admin->forceFill(['id' => 'rename-admin', 'name' => 'Admin test', 'email' => 'rename@example.test',
        'password_hash' => 'unused', 'is_active' => true, 'is_superadmin' => true])->save();
    Sanctum::actingAs($admin);
    $this->patchJson('/api/v1/teknisi/outlets/workflow-outlet', ['name' => 'Outlet baru'])->assertOk();
    expect(DB::table('teknisi_outlets')->where('id', 'workflow-outlet')->value('name'))->toBe('Outlet baru');
    DB::table('teknisi_participants')->insert(['id' => 'rename-person', 'userId' => 'workflow-tech-user',
        'nip' => 'PTH99', 'phone' => '628100000000', 'address' => 'Test']);
    $this->putJson('/api/v1/teknisi/participants/rename-person', [
        'name' => 'Teknisi baru', 'address' => 'Test', 'phone' => '628100000000', 'outletId' => 'workflow-outlet', 'specialty' => 'Servis HP',
    ])->assertOk();
    expect(User::find('workflow-tech-user')->name)->toBe('Teknisi baru');
    expect(TeknisiTechnician::find('workflow-tech')->name)->toBe('Teknisi baru');
});
