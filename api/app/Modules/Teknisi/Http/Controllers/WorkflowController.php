<?php

namespace App\Modules\Teknisi\Http\Controllers;

use App\Modules\Teknisi\Models\ServiceDetail;
use App\Modules\Teknisi\Models\ServiceMedia;
use App\Modules\Teknisi\Models\TeknisiEvent;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use App\Modules\Teknisi\Models\TeknisiTicket;
use App\Modules\Teknisi\Services\TeknisiContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class WorkflowController
{
    public function __construct(private TeknisiContext $context) {}

    private function event(TeknisiTicket $ticket, array $actor, string $note): void
    {
        $event = new TeknisiEvent;
        $event->ticketId = $ticket->id;
        $event->status = $ticket->status;
        $event->actorName = $actor['user']->name;
        $event->note = $note;
        $event->save();
    }

    private function photoRules(string $field, bool $required = true): array
    {
        return [$field => ($required ? 'required' : 'nullable').'|file|image|mimes:jpg,jpeg,png,webp|max:4096'];
    }

    private function photo(Request $request, string $field, string $stage, TeknisiTicket $ticket, array &$stored): void
    {
        if (! $request->hasFile($field)) {
            return;
        }
        $path = $request->file($field)->store('teknisi-service', 'local');
        abort_unless(is_string($path) && $path !== '', 500, 'Foto belum berhasil disimpan.');
        $stored[] = $path;
        $media = new ServiceMedia;
        $media->ticketId = $ticket->id;
        $media->stage = $stage;
        $media->path = $path;
        $media->mime = $request->file($field)->getMimeType();
        $media->save();
    }

    private function guarded(callable $operation): mixed
    {
        $stored = [];
        try {
            return DB::transaction(function () use ($operation, &$stored) {
                return $operation($stored);
            });
        } catch (\Throwable $error) {
            foreach ($stored as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $error;
        }
    }

    public function create(Request $request)
    {
        $actor = $this->context->actor($request, true);
        $data = $request->validate([
            'serviceType' => 'required|in:normal,warranty',
            'warrantyParentId' => 'nullable|required_if:serviceType,warranty|string',
        ] + $this->photoRules('beforePhoto'));
        $ticket = $this->guarded(function (array &$stored) use ($request, $actor, $data) {
            $parent = null;
            if ($data['serviceType'] === 'warranty') {
                $parent = $this->context->scope(TeknisiTicket::query(), $actor)
                    ->where('id', $data['warrantyParentId'])->lockForUpdate()->firstOrFail();
                $warranty = $parent->workflow;
                abort_unless($parent->status === 'collected' && $warranty?->warrantyUntil?->isFuture(), 422, 'Garansi tiket asal tidak aktif.');
                abort_unless($parent->outletId === $request->input('outletId'), 422, 'Servis garansi harus di outlet tiket asal.');
                abort_if(ServiceDetail::where('warrantyParentId', $parent->id)->whereIn('ticketId',
                    TeknisiTicket::whereNotIn('status', TeknisiContext::CLOSED)->select('id'))->exists(), 409, 'Tiket garansi ini masih dikerjakan.');
                // Device and customer identity remain linked to the original repair.
                $request->merge(['device' => $parent->device, 'imei' => $parent->imei,
                    'customerName' => $parent->customerName, 'customerPhone' => $parent->customerPhone,
                    'participantId' => $parent->participantId, 'estimate' => 0]);
            }
            $row = app(OperationController::class)->createTicket($request)->getData()->data;
            $ticket = TeknisiTicket::findOrFail($row->id);
            $detail = new ServiceDetail;
            $detail->ticketId = $ticket->id;
            $detail->serviceType = $data['serviceType'];
            $detail->warrantyParentId = $parent?->id;
            $detail->save();
            $this->photo($request, 'beforePhoto', 'before', $ticket, $stored);
            if ($parent) {
                $this->event($ticket, $actor, 'Servis garansi dari '.$parent->number.'. Tidak mengubah transaksi tiket asal.');
                $this->event($parent, $actor, 'Klaim garansi dibuat: '.$ticket->number);
            }

            return $ticket;
        });

        return response()->json(['data' => $ticket], 201);
    }

    public function advance(Request $request)
    {
        $actor = $this->context->actor($request, true);
        $input = $request->validate([
            'ticketId' => 'required|string', 'operation' => 'required|in:start,complete,collect,cancel',
            'expectedStatus' => 'required|string', 'expectedVersion' => 'required|date',
        ]);
        $operation = $input['operation'];
        $validationTicket = $this->context->scope(TeknisiTicket::query(), $actor)
            ->where('id', $input['ticketId'])->with('workflow')->firstOrFail();
        $isWarranty = $validationTicket->workflow?->serviceType === 'warranty';
        $rules = match ($operation) {
            'complete' => ['diagnosis' => 'required|string|max:3000', 'treatment' => 'required|string|max:3000',
                'capital' => 'required|integer|min:0|max:1000000000', 'finalPrice' => ($isWarranty ? 'nullable' : 'required').'|integer|min:0|max:1000000000',
                'replacedParts' => 'nullable|string|max:3000',
                'warrantyDays' => 'required|integer|min:0|max:365'] + $this->photoRules('afterPhoto'),
            'collect' => ['amount' => ($isWarranty ? 'nullable' : 'required').'|integer|min:0|max:1000000000',
                'paymentMethod' => ($isWarranty ? 'nullable' : 'required').'|in:cash,transfer,qris,warranty', 'receiverName' => 'required|string|max:191',
                'receiverPhone' => 'required|string|max:30'] + $this->photoRules('handoverPhoto')
                + $this->photoRules('paymentProof', false),
            'cancel' => ['cancelReason' => 'required|string|max:3000'],
            default => [],
        };
        $data = $request->validate($rules);
        $this->guarded(function (array &$stored) use ($request, $actor, $input, $operation, $data) {
            $ticket = $this->context->scope(TeknisiTicket::query(), $actor)
                ->where('id', $input['ticketId'])->lockForUpdate()->firstOrFail();
            abort_unless($ticket->status === $input['expectedStatus']
                && $ticket->updatedAt->equalTo(CarbonImmutable::parse($input['expectedVersion'])),
                409, 'Servisan sudah berubah. Buka ulang tahap ini; draft isian tetap tersimpan.');
            $detail = $ticket->workflow ?? new ServiceDetail;
            $detail->ticketId = $ticket->id;
            if ($operation === 'start') {
                abort_unless(in_array($ticket->status, ['received', 'diagnosis', 'approval', 'waiting_parts'], true), 422, 'Hanya servisan pending yang dapat dikerjakan.');
                if (! $ticket->technicianId) {
                    $ticket->technicianId = $actor['tech']?->id ?? TeknisiTechnician::where('outletId', $ticket->outletId)->where('isActive', true)->value('id');
                }
                abort_unless($ticket->technicianId && TeknisiTechnician::where('id', $ticket->technicianId)->where('outletId', $ticket->outletId)->where('isActive', true)->exists(), 422, 'Outlet belum memiliki teknisi aktif.');
                $ticket->status = 'repairing';
                $detail->startedAt ??= now();
                $note = 'Pengerjaan dimulai setelah memeriksa data penerimaan.';
            } elseif ($operation === 'complete') {
                abort_unless($ticket->status === 'repairing' || ($ticket->status === 'ready' && $detail->finalPrice === null), 422, 'Selesaikan hanya servisan yang sedang diproses.');
                $data['finalPrice'] = $data['finalPrice'] ?? 0;
                $data['replacedParts'] = $data['replacedParts'] ?? null;
                foreach (['diagnosis', 'treatment', 'replacedParts', 'capital', 'finalPrice', 'warrantyDays'] as $key) {
                    $detail->$key = $data[$key];
                }
                $detail->readyAt = now();
                $ticket->serviceCost = $data['finalPrice'];
                $ticket->status = 'ready';
                $this->photo($request, 'afterPhoto', 'after', $ticket, $stored);
                $note = "Perbaikan selesai. Siap diambil.\nDiagnosis: ".$data['diagnosis']."\nTindakan: ".$data['treatment']."\nPart dibeli/diganti: ".($data['replacedParts'] ?? 'Tidak ada')."\nModal: ".$data['capital']."\nHarga final: ".$data['finalPrice']."\nGaransi: ".$data['warrantyDays'].' hari sejak pengambilan.';
            } elseif ($operation === 'collect') {
                abort_unless($ticket->status === 'ready', 422, 'Hanya servisan ready yang dapat diserahkan.');
                abort_unless($detail->finalPrice !== null, 422, 'Harga final belum tercatat. Lengkapi penyelesaian servis terlebih dahulu.');
                $isWarranty = $detail->serviceType === 'warranty';
                $data['amount'] = $data['amount'] ?? 0;
                $waived = $isWarranty && (int) $data['amount'] === 0;
                abort_unless($waived || (int) $data['amount'] === $detail->finalPrice, 422, 'Nominal pembayaran harus sama dengan harga final.');
                if ($waived) {
                    $detail->finalPrice = 0;
                    $ticket->serviceCost = 0;
                    $data['paymentMethod'] = 'warranty';
                }
                abort_if((int) $data['amount'] > 0 && empty($data['paymentMethod']), 422, 'Pilih tipe pembayaran bila ada pembayaran.');
                abort_if($data['paymentMethod'] === 'warranty' && ($detail->serviceType !== 'warranty' || $detail->finalPrice !== 0), 422, 'Metode garansi hanya untuk klaim tanpa tagihan.');
                abort_if((int) $data['amount'] > 0 && in_array($data['paymentMethod'], ['transfer', 'qris'], true) && ! $request->hasFile('paymentProof'), 422, 'Bukti bayar wajib untuk transfer atau QRIS.');
                $detail->collectedAt = now();
                $detail->warrantyUntil = $detail->warrantyDays > 0 ? CarbonImmutable::now()->addDays($detail->warrantyDays) : null;
                foreach (['paymentMethod', 'receiverName', 'receiverPhone'] as $key) {
                    $detail->$key = $data[$key];
                }
                $ticket->status = 'collected';
                $this->photo($request, 'paymentProof', 'payment', $ticket, $stored);
                $this->photo($request, 'handoverPhoto', 'handover', $ticket, $stored);
                $note = 'Perangkat diambil oleh '.$data['receiverName'].' ('.$data['receiverPhone'].'). Pembayaran '.$data['paymentMethod'].': '.$data['amount'].'.';
            } else {
                abort_if(in_array($ticket->status, TeknisiContext::CLOSED, true), 422, 'Servisan sudah ditutup.');
                $ticket->status = 'cancelled';
                $detail->cancelReason = $data['cancelReason'];
                $note = 'Servis dibatalkan: '.$data['cancelReason'].'. Riwayat tetap disimpan; perangkat harus dikembalikan kepada pelanggan.';
            }
            $ticket->updatedAt = CarbonImmutable::now()->max($ticket->updatedAt->addMillisecond());
            $ticket->save();
            $detail->save();
            $this->event($ticket, $actor, $note);
        });

        return response()->json(['data' => true]);
    }

    public function media(Request $request, string $id)
    {
        $actor = $this->context->actor($request);
        $media = ServiceMedia::findOrFail($id);
        $this->context->scope(TeknisiTicket::query(), $actor)->where('id', $media->ticketId)->firstOrFail();
        abort_unless(Storage::disk('local')->exists($media->getRawOriginal('path')), 404);

        return response()->file(Storage::disk('local')->path($media->getRawOriginal('path')), [
            'Content-Type' => $media->mime, 'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function finance(Request $request)
    {
        $actor = $this->context->actor($request);
        $data = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from', 'outlet' => 'nullable|string']);
        $from = CarbonImmutable::parse($data['from'] ?? now('Asia/Jakarta')->startOfMonth()->toDateString(), 'Asia/Jakarta')->startOfDay()->utc();
        $to = CarbonImmutable::parse($data['to'] ?? now('Asia/Jakarta')->toDateString(), 'Asia/Jakarta')->endOfDay()->utc();
        abort_if($to->lessThan($from), 422, 'Tanggal akhir harus setelah tanggal awal.');
        $base = $this->context->scope(TeknisiTicket::query(), $actor, 'teknisi_tickets.outletId')
            ->join('teknisi_service_details as detail', 'detail.ticketId', '=', 'teknisi_tickets.id')
            ->where('teknisi_tickets.status', 'collected')->whereBetween('detail.collectedAt', [$from, $to])
            ->when($request->filled('outlet'), fn ($q) => $q->where('teknisi_tickets.outletId', $data['outlet']));
        $totals = (clone $base)->selectRaw('COUNT(*) as total, COALESCE(SUM(detail.finalPrice), 0) as revenue, COALESCE(SUM(detail.capital), 0) as capital')->first();

        return response()->json(['data' => [
            'from' => $from->setTimezone('Asia/Jakarta')->toDateString(),
            'to' => $to->setTimezone('Asia/Jakarta')->toDateString(),
            'total' => (int) $totals->total, 'revenue' => (int) $totals->revenue,
            'capital' => (int) $totals->capital, 'profit' => (int) $totals->revenue - (int) $totals->capital,
        ]]);
    }
}
