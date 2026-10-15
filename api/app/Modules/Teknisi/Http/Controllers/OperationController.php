<?php

namespace App\Modules\Teknisi\Http\Controllers;

use App\Modules\Core\Models\User;
use App\Modules\Teknisi\Models\TeknisiEvent;
use App\Modules\Teknisi\Models\TeknisiOutlet;
use App\Modules\Teknisi\Models\TeknisiPart;
use App\Modules\Teknisi\Models\TeknisiParticipant;
use App\Modules\Teknisi\Models\TeknisiPartUse;
use App\Modules\Teknisi\Models\TeknisiStockMovement;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use App\Modules\Teknisi\Models\TeknisiTicket;
use App\Modules\Teknisi\Services\TeknisiContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OperationController
{
    public function __construct(private TeknisiContext $context) {}

    private function event($ticket, array $actor, string $note): void
    {
        $event = new TeknisiEvent;
        $event->ticketId = $ticket->id;
        $event->status = $ticket->status;
        $event->note = $note;
        $event->actorName = $actor['user']->name;
        $event->save();
    }

    private function ticket(array $actor, string $id)
    {
        return $this->context->scope(TeknisiTicket::query(), $actor)->where('id', $id)->lockForUpdate()->firstOrFail();
    }

    private function open($ticket): void
    {
        abort_if(in_array($ticket->status, TeknisiContext::CLOSED, true), 409, 'Tiket ini sudah ditutup.');
    }

    public function outlet(Request $request)
    {
        $this->context->actor($request, true, true);
        $data = $request->validate(['name' => 'required|string|max:191', 'address' => 'required|string|max:1000', 'phone' => 'required|string|max:30']);
        $row = new TeknisiOutlet;
        foreach ($data as $key => $value) {
            $row->$key = $value;
        } $row->save();

        return response()->json(['data' => $row], 201);
    }

    public function technician(Request $request)
    {
        $this->context->actor($request, true, true);
        $data = $request->validate(['userId' => 'required|string', 'outletId' => 'required|string', 'specialty' => 'required|string|max:191']);
        $row = DB::transaction(function () use ($data) {
            $account = User::where('id', $data['userId'])->where('is_active', true)->firstOrFail();
            abort_unless(DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $account->id)->where('modules.slug', 'teknisi')->where('role', 'technician')->exists(), 422);
            TeknisiOutlet::where('id', $data['outletId'])->where('isActive', true)->lockForUpdate()->firstOrFail();
            $row = TeknisiTechnician::where('userId', $account->id)->lockForUpdate()->first() ?? new TeknisiTechnician;
            abort_if($row->exists && $row->outletId !== $data['outletId'] && TeknisiTicket::where('technicianId', $row->id)->whereNotIn('status', TeknisiContext::CLOSED)->exists(), 409, 'Selesaikan tiket aktif sebelum memindahkan teknisi.');
            abort_if(TeknisiTechnician::where('outletId', $data['outletId'])->where('isActive', true)->where('userId', '!=', $account->id)->exists(), 409, 'Outlet sudah memiliki teknisi aktif.');
            $row->userId = $account->id;
            $row->name = $account->name;
            $row->outletId = $data['outletId'];
            $row->activeOutletId = $data['outletId'];
            $row->specialty = $data['specialty'];
            $row->isActive = true;
            $row->save();

            return $row;
        });

        return response()->json(['data' => $row]);
    }

    public function createTicket(Request $request)
    {
        $actor = $this->context->actor($request, true);
        $data = $request->validate(['outletId' => 'required|string', 'technicianId' => 'nullable|string', 'participantId' => 'nullable|string', 'priority' => 'required|in:normal,urgent', 'dueAt' => 'nullable|date_format:Y-m-d', 'customerName' => 'nullable|string|max:191', 'customerPhone' => 'nullable|string|max:30', 'device' => 'required|string|max:191', 'imei' => 'nullable|string|max:30', 'complaint' => 'required|string|max:3000', 'accessories' => 'nullable|string|max:1000', 'estimate' => 'required|integer|min:0|max:1000000000']);
        $row = DB::transaction(function () use ($data, $actor) {
            $outlet = $this->context->scope(TeknisiOutlet::where('isActive', true), $actor, 'id')->where('id', $data['outletId'])->lockForUpdate()->firstOrFail();
            $techId = $actor['tech']?->id ?? ($data['technicianId'] ?? null);
            if ($techId) {
                TeknisiTechnician::where('id', $techId)->where('outletId', $outlet->id)->where('isActive', true)->firstOrFail();
            }
            $participantId = $actor['manager'] ? ($data['participantId'] ?? null) : null;
            $participant = $participantId ? TeknisiParticipant::where('id', $participantId)->whereNull('deleted_at')->whereHas('user', fn ($q) => $q->where('is_active', true))->with('user')->firstOrFail() : null;
            $row = new TeknisiTicket;
            foreach (['device', 'imei', 'complaint', 'accessories', 'estimate', 'priority'] as $key) {
                $row->$key = $data[$key] ?? null;
            }
            $row->number = 'HP-'.gmdate('Ymd').'-'.strtoupper(bin2hex(random_bytes(4)));
            $row->trackingToken = bin2hex(random_bytes(24));
            $row->outletId = $outlet->id;
            $row->technicianId = $techId;
            $row->participantId = $participantId;
            $row->customerName = $participant?->user->name ?? trim($data['customerName'] ?? '');
            $row->customerPhone = $participant?->phone ?? trim($data['customerPhone'] ?? '');
            abort_if(! $row->customerName || ! $row->customerPhone, 422, 'Nama dan telepon pelanggan wajib diisi.');
            $row->dueAt = empty($data['dueAt']) ? null : CarbonImmutable::createFromFormat('!Y-m-d', $data['dueAt'], 'Asia/Jakarta')->endOfDay()->utc();
            $row->status = 'received';
            $row->save();
            $this->event($row, $actor, 'Perangkat diterima di outlet.');

            return $row;
        });

        return response()->json(['data' => $row], 201);
    }

    public function link(Request $request)
    {
        $actor = $this->context->actor($request, true, true);
        $data = $request->validate(['ticketId' => 'required|string', 'participantId' => 'nullable|string']);
        DB::transaction(function () use ($data, $actor) {
            if (! empty($data['participantId'])) {
                TeknisiParticipant::where('id', $data['participantId'])->whereNull('deleted_at')->whereHas('user', fn ($q) => $q->where('is_active', true))->firstOrFail();
            }
            $row = $this->ticket($actor, $data['ticketId']);
            $row->participantId = $data['participantId'] ?? null;
            $row->save();
        });

        return response()->json(['data' => true]);
    }

    public function update(Request $request)
    {
        $actor = $this->context->actor($request, true);
        $rules = ['ticketId' => 'required|string', 'status' => 'required|in:'.implode(',', array_keys(TeknisiContext::TRANSITIONS)), 'expectedStatus' => 'required|string', 'expectedVersion' => 'required|date', 'note' => 'required|string|max:3000', 'technicianId' => 'nullable|string'];
        if ($actor['manager']) {
            $rules += ['estimate' => 'required|integer|min:0|max:1000000000', 'serviceCost' => 'required|integer|min:0|max:1000000000'];
        }
        $data = $request->validate($rules);
        DB::transaction(function () use ($data, $actor) {
            $row = $this->ticket($actor, $data['ticketId']);
            $this->open($row);
            abort_unless($row->status === $data['expectedStatus'] && $row->updatedAt->equalTo(CarbonImmutable::parse($data['expectedVersion'])), 409, 'Tiket telah diperbarui. Muat ulang halaman.');
            abort_unless($row->status === $data['status'] || in_array($data['status'], TeknisiContext::TRANSITIONS[$row->status] ?? [], true), 422, 'Perubahan status tidak sesuai alur servis.');
            abort_if($data['status'] === 'collected' && ! $actor['manager'], 403, 'Pengambilan perangkat harus dicatat admin outlet.');
            $techId = $actor['tech']?->id ?? ($data['technicianId'] ?? null);
            if ($techId) {
                TeknisiTechnician::where('id', $techId)->where('outletId', $row->outletId)->where('isActive', true)->firstOrFail();
            }
            abort_if(in_array($data['status'], ['repairing', 'ready'], true) && ! $techId, 422, 'Tentukan teknisi terlebih dahulu.');
            $row->status = $data['status'];
            $row->technicianId = $techId;
            if ($actor['manager']) {
                $row->estimate = $data['estimate'];
                $row->serviceCost = $data['serviceCost'];
            }
            $row->save();
            $this->event($row, $actor, $data['note']);
        });

        return response()->json(['data' => true]);
    }

    public function part(Request $request)
    {
        $actor = $this->context->actor($request, true);
        $data = $request->validate(['outletId' => 'required|string', 'sku' => 'required|string|max:60', 'name' => 'required|string|max:191', 'stock' => 'required|integer|min:0|max:1000000000', 'minimum' => 'required|integer|min:0|max:1000000000', 'price' => 'required|integer|min:0|max:1000000000']);
        $row = DB::transaction(function () use ($data, $actor) {
            $this->context->scope(TeknisiOutlet::where('isActive', true), $actor, 'id')->where('id', $data['outletId'])->firstOrFail();
            $row = new TeknisiPart;
            foreach ($data as $key => $value) {
                $row->$key = $value;
            } $row->save();
            $this->movement($row, $actor, $row->stock, 'Stok awal');

            return $row;
        });

        return response()->json(['data' => $row], 201);
    }

    private function movement($part, array $actor, int $quantity, string $note): void
    {
        $row = new TeknisiStockMovement;
        $row->partId = $part->id;
        $row->quantity = $quantity;
        $row->note = $note;
        $row->actorName = $actor['user']->name;
        $row->save();
    }

    public function restock(Request $request)
    {
        $actor = $this->context->actor($request, true);
        $data = $request->validate(['partId' => 'required|string', 'quantity' => 'required|integer|min:1|max:1000000000', 'note' => 'required|string|max:500']);
        DB::transaction(function () use ($data, $actor) {
            $row = $this->context->scope(TeknisiPart::query(), $actor)->where('id', $data['partId'])->lockForUpdate()->firstOrFail();
            abort_if($row->stock + $data['quantity'] > 1000000000, 422, 'Stok melebihi batas.');
            $row->stock += $data['quantity'];
            $row->save();
            $this->movement($row, $actor, $data['quantity'], $data['note']);
        });

        return response()->json(['data' => true]);
    }

    public function need(Request $request)
    {
        return $this->usePart($request, false);
    }

    public function consume(Request $request)
    {
        return $this->usePart($request, true);
    }

    private function usePart(Request $request, bool $consume)
    {
        $actor = $this->context->actor($request, true);
        $data = $request->validate(['ticketId' => 'required|string', 'partId' => ($consume ? 'required' : 'nullable').'|string', 'quantity' => 'required|integer|min:1|max:1000000000', 'note' => ($consume ? 'nullable' : 'required').'|string|max:2000']);
        DB::transaction(function () use ($data, $actor, $consume) {
            $ticket = $this->ticket($actor, $data['ticketId']);
            $this->open($ticket);
            abort_if($consume && ! in_array($ticket->status, ['diagnosis', 'repairing', 'waiting_parts'], true), 409, 'Sparepart hanya dapat dipakai saat pengecekan atau pengerjaan.');
            $part = empty($data['partId']) ? null : TeknisiPart::where('id', $data['partId'])->where('outletId', $ticket->outletId)->lockForUpdate()->firstOrFail();
            $ticket->updatedAt = now();
            $ticket->save();
            if (! $consume) {
                $this->event($ticket, $actor, 'Kebutuhan sparepart: '.($part ? $part->name.' ('.$part->sku.')' : 'Belum terdaftar').' × '.$data['quantity']." unit.\n".$data['note']);

                return;
            }
            abort_if($part->stock < $data['quantity'], 409, 'Stok sparepart tidak mencukupi.');
            $part->stock -= $data['quantity'];
            $part->save();
            $use = new TeknisiPartUse;
            $use->ticketId = $ticket->id;
            $use->partId = $part->id;
            $use->quantity = $data['quantity'];
            $use->unitPrice = $part->price;
            $use->save();
            $this->movement($part, $actor, -$data['quantity'], 'Dipakai pada '.$ticket->number);
            $this->event($ticket, $actor, 'Pemakaian '.$part->name.': '.$data['quantity'].' unit.');
        });

        return response()->json(['data' => true]);
    }
}
