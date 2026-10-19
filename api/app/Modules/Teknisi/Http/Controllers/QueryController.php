<?php

namespace App\Modules\Teknisi\Http\Controllers;

use App\Modules\Teknisi\Models\TeknisiEvent;
use App\Modules\Teknisi\Models\TeknisiOutlet;
use App\Modules\Teknisi\Models\TeknisiPart;
use App\Modules\Teknisi\Models\TeknisiParticipant;
use App\Modules\Teknisi\Models\TeknisiStockMovement;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use App\Modules\Teknisi\Models\TeknisiTicket;
use App\Modules\Teknisi\Services\TeknisiContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QueryController
{
    public function __construct(private TeknisiContext $context) {}

    private function data($data)
    {
        return response()->json(['data' => $data]);
    }

    private function outlets(array $actor)
    {
        return $this->context->scope(TeknisiOutlet::query(), $actor, 'id')->orderBy('name');
    }

    private function tickets(array $actor)
    {
        return $this->context->scope(TeknisiTicket::query(), $actor);
    }

    private function technicians(array $actor)
    {
        return TeknisiTechnician::when($actor['tech'], fn ($q) => $q->where('id', $actor['tech']->id));
    }

    public function ticketsList(Request $request)
    {
        $actor = $this->context->actor($request);
        $query = $this->tickets($actor)->with(['outlet', 'technician']);
        if ($request->filled('outlet')) {
            $query->where('outletId', $request->string('outlet')->toString());
        }
        if (array_key_exists($request->input('status', ''), TeknisiContext::TRANSITIONS)) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('q')) {
            $q = '%'.mb_substr($request->string('q')->toString(), 0, 200).'%';
            $query->where(fn ($builder) => $builder->where('number', 'like', $q)->orWhere('customerName', 'like', $q)->orWhere('device', 'like', $q)->orWhere('customerPhone', 'like', $q));
        }
        $page = max(1, min(100000, (int) $request->input('page', 1)));
        $total = (clone $query)->count();

        return $this->data(['tickets' => $query->orderByDesc('createdAt')->skip(($page - 1) * 25)->take(25)->get(), 'total' => $total, 'page' => $page, 'outlets' => $this->outlets($actor)->get()]);
    }

    public function detail(Request $request, string $id)
    {
        $actor = $this->context->actor($request);
        $ticket = $this->tickets($actor)->where('id', $id)->with(['outlet', 'technician', 'events' => fn ($q) => $q->orderByDesc('createdAt'), 'partUses.part'])->firstOrFail();

        return $this->data(['ticket' => $ticket, 'technicians' => TeknisiTechnician::where('outletId', $ticket->outletId)->where('isActive', true)->get(), 'parts' => TeknisiPart::where('outletId', $ticket->outletId)->get()]);
    }

    public function newTicket(Request $request)
    {
        $actor = $this->context->actor($request, true);

        return $this->data(['outlets' => $this->outlets($actor)->where('isActive', true)->get(), 'technicians' => $this->technicians($actor)->where('isActive', true)->with('outlet')->get()]);
    }

    public function outletsList(Request $request)
    {
        $actor = $this->context->actor($request);

        return $this->data($this->outlets($actor)->withCount(['technicians', 'tickets'])->get()->map(function ($row) {
            $data = $row->toArray();
            unset($data['technicians_count'], $data['tickets_count']);
            $data['_count'] = ['technicians' => $row->technicians_count, 'tickets' => $row->tickets_count];

            return $data;
        }));
    }

    public function parts(Request $request)
    {
        $actor = $this->context->actor($request);

        return $this->data(['parts' => $this->context->scope(TeknisiPart::query(), $actor)->with('outlet')->orderBy('outletId')->orderBy('name')->get(), 'outlets' => $this->outlets($actor)->where('isActive', true)->get(), 'movements' => TeknisiStockMovement::whereHas('part', fn ($q) => $this->context->scope($q, $actor))->with('part:id,name')->orderByDesc('createdAt')->take(10)->get()]);
    }

    public function monitoring(Request $request)
    {
        $actor = $this->context->actor($request);
        $outlet = $actor['tech'] ? $actor['tech']->outletId : $request->input('outlet');
        $tickets = $this->tickets($actor)->when($outlet, fn ($q) => $q->where('outletId', $outlet));
        $grouped = (clone $tickets)->select('status')->selectRaw('COUNT(*) AS total')->groupBy('status')->get()->map(fn ($row) => ['status' => $row->status, '_count' => ['_all' => (int) $row->total]]);

        return $this->data(['grouped' => $grouped,
            'overdue' => (clone $tickets)->whereNotIn('status', TeknisiContext::CLOSED)->where('dueAt', '<', now())->with(['outlet', 'technician'])->orderBy('dueAt')->take(10)->get(),
            'recent' => TeknisiEvent::whereHas('ticket', fn ($q) => $this->context->scope($q, $actor)->when($outlet, fn ($b) => $b->where('outletId', $outlet)))->with('ticket:id,number,device')->orderByDesc('createdAt')->take(8)->get(),
            'outlets' => $this->outlets($actor)->with(['tickets' => fn ($q) => $q->whereNotIn('status', TeknisiContext::CLOSED)->select('id', 'outletId', 'status')])->get(),
            'lowStock' => $this->context->scope(TeknisiPart::query(), $actor)->when($outlet, fn ($q) => $q->where('outletId', $outlet))->whereColumn('stock', '<=', 'minimum')->with('outlet')->orderBy('stock')->get(),
            'technicians' => $this->technicians($actor)->where('isActive', true)->when($outlet, fn ($q) => $q->where('outletId', $outlet))->with(['outlet', 'tickets' => fn ($q) => $q->whereNotIn('status', TeknisiContext::CLOSED)->select('id', 'technicianId')])->orderBy('name')->get()]);
    }

    public function people(Request $request)
    {
        $actor = $this->context->actor($request);
        $page = max(1, min(100000, (int) $request->input('page', 1)));
        $query = TeknisiParticipant::whereNull('deleted_at')->when($actor['tech'], fn ($q) => $q->where('userId', $actor['user']->id));
        if ($request->filled('q')) {
            $q = '%'.mb_substr($request->input('q'), 0, 100).'%';
            $query->where(fn ($b) => $b->where('nip', 'like', $q)->orWhere('phone', 'like', $q)->orWhereHas('user', fn ($u) => $u->where('name', 'like', $q)));
        }
        $total = (clone $query)->count();
        $people = $query->with('user:id,name,is_active')->orderByDesc('createdAt')->skip(($page - 1) * 25)->take(25)->get()->map(function ($row) {
            $data = $row->toArray();
            $data['user'] = ['name' => $row->user->name, 'isActive' => (bool) $row->user->is_active];

            return $data;
        });
        $technicians = $this->technicians($actor)->with('outlet')->withCount(['tickets' => fn ($q) => $q->whereNotIn('status', TeknisiContext::CLOSED)])->get()->map(function ($row) {
            $data = $row->toArray();
            unset($data['tickets_count']);
            $data['_count'] = ['tickets' => $row->tickets_count];

            return $data;
        });

        return $this->data(['people' => $people, 'total' => $total, 'technicians' => $technicians, 'outlets' => $actor['manager'] ? $this->outlets($actor)->where('isActive', true)->whereDoesntHave('technicians', fn ($q) => $q->where('isActive', true))->get() : []]);
    }

    public function person(Request $request, string $id)
    {
        $actor = $this->context->actor($request, false, true);
        $person = TeknisiParticipant::where('id', $id)->whereNull('deleted_at')->with('user:id,name')->firstOrFail();

        return $this->data(['person' => $person, 'technician' => TeknisiTechnician::where('userId', $person->userId)->first(), 'outlets' => $this->outlets($actor)->where('isActive', true)->with(['technicians' => fn ($q) => $q->where('isActive', true)->select('id', 'outletId', 'userId')])->get()]);
    }

    public function profile(Request $request)
    {
        abort_unless(DB::table('modules')->where('slug', 'teknisi')->where('is_active', true)->exists(), 403);
        $row = TeknisiParticipant::where('userId', $request->user()->id)->whereNull('deleted_at')->with('user:id,name')->firstOrFail();

        return $this->data($row);
    }

    public function participantTickets(Request $request)
    {
        abort_unless(DB::table('modules')->where('slug', 'teknisi')->where('is_active', true)->exists(), 403);
        $person = TeknisiParticipant::where('userId', $request->user()->id)->whereNull('deleted_at')->firstOrFail();

        return $this->data(TeknisiTicket::where('participantId', $person->id)->select('id', 'number', 'device', 'status', 'dueAt', 'createdAt', 'serviceCost', 'estimate', 'outletId')->with(['outlet:id,name,phone', 'partUses:id,ticketId,quantity,unitPrice', 'events' => fn ($q) => $q->select('id', 'ticketId', 'status', 'createdAt')->orderBy('createdAt')])->orderByDesc('createdAt')->take(100)->get());
    }

    public function publicOutlets()
    {
        return $this->data(TeknisiOutlet::where('isActive', true)->select('id', 'name', 'address', 'phone')->orderBy('name')->get());
    }

    public function tracking(Request $request, string $token)
    {
        abort_unless(preg_match('/^[a-f0-9]{48}$/', $token), 404);

        return $this->data(TeknisiTicket::where('trackingToken', $token)->select('id', 'number', 'status', 'createdAt', 'updatedAt', 'dueAt', 'outletId')->with(['outlet:id,name,phone', 'events' => fn ($q) => $q->select('id', 'ticketId', 'status', 'createdAt')->orderBy('createdAt')])->firstOrFail());
    }

    public function export(Request $request)
    {
        $actor = $this->context->actor($request);
        $rows = $this->tickets($actor)->with(['outlet', 'technician'])->orderByDesc('createdAt')->take(10000)->get();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Nomor', 'Pelanggan', 'Telepon', 'Perangkat', 'Outlet', 'Teknisi', 'Status', 'Estimasi', 'Biaya jasa', 'Diterima'], ',', '"', '');
            foreach ($rows as $row) {
                $values = [$row->number, $row->customerName, $row->customerPhone, $row->device, $row->outlet->name, $row->technician?->name, $row->status, $row->estimate, $row->serviceCost, $row->createdAt->toIso8601String()];
                $values = array_map(fn ($v) => preg_match('/^[=+@\-\t\r]/', (string) $v) ? "'".$v : $v, $values);
                fputcsv($out, $values, ',', '"', '');
            }
            fclose($out);
        }, 'tiket-teknisi.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
