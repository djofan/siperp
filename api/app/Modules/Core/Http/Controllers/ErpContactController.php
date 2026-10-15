<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Core\Models\AccessLog;
use App\Modules\Core\Models\CoreContact as Contact;
use App\Modules\Core\Models\CoreContactSource as Source;
use App\Modules\Lazsip\Models\LazsipBeneficiary;
use App\Modules\Lazsip\Models\LazsipProgramApplicant;
use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Sarsip\Models\SarsipBeneficiary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ErpContactController
{
    private function data(array $data)
    {
        return response()->json(['data' => $data]);
    }

    private function phone(?string $value): ?string
    {
        $value = preg_replace('/[\s()+.\-]/', '', $value ?? '');
        if (str_starts_with($value, '00')) {
            $value = substr($value, 2);
        } if (str_starts_with($value, '0')) {
            $value = '62'.substr($value, 1);
        } elseif (str_starts_with($value, '8')) {
            $value = '62'.$value;
        }

return preg_match('/^\d{8,15}$/', $value) ? $value : null;
    }

    private function email(?string $value): ?string
    {
        $value = strtolower(trim($value ?? ''));

        return strlen($value) <= 191 && filter_var($value, FILTER_VALIDATE_EMAIL) ? $value : null;
    }

    private function log(Request $request, string $message): void
    {
        $row = new AccessLog;
        $row->message = $request->user()->name.' '.$message;
        $row->save();
    }

    public function index(Request $request)
    {
        $query = Contact::query();
        $search = mb_substr($request->input('q', ''), 0, 200);
        $page = max(1, min(100000, (int) $request->input('page', 1)));
        if ($search) {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('phone', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%'));
        }
        $count = (clone $query)->count();
        $contacts = $query->with('sources')->orderBy('name')->skip(($page - 1) * 30)->take(30)->get();

        return $this->data(['contacts' => $contacts, 'count' => $count, 'selected' => $request->filled('id') ? Contact::with('sources')->find($request->input('id')) : null]);
    }

    public function save(Request $request)
    {
        $data = $request->validate(['id' => 'nullable|string', 'name' => 'required|string|min:2|max:191', 'phone' => 'nullable|string|max:30', 'email' => 'nullable|string|max:191', 'notes' => 'nullable|string|max:5000']);
        $phone = $this->phone($data['phone'] ?? null);
        $email = $this->email($data['email'] ?? null);
        abort_if(! empty($data['phone']) && ! $phone || ! empty($data['email']) && ! $email, 422, 'Nomor telepon atau email tidak valid.');
        DB::transaction(function () use ($data, $phone, $email, $request) {
            $row = empty($data['id']) ? new Contact : Contact::where('id', $data['id'])->lockForUpdate()->firstOrFail();
            $row->name = $data['name'];
            $row->phone = $phone;
            $row->email = $email;
            $row->notes = $data['notes'] ?? null;
            $row->save();
            $this->log($request, 'menyimpan kontak ERP '.$row->name.'.');
        });

        return $this->data(['message' => 'Kontak disimpan.']);
    }

    public function merge(Request $request)
    {
        $data = $request->validate(['target' => 'required|string|different:source', 'source' => 'required|string', 'confirm' => 'required|in:yes']);
        DB::transaction(function () use ($data, $request) {
            $contacts = Contact::whereIn('id', [$data['target'], $data['source']])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            abort_unless($contacts->count() === 2, 404);
            $kept = $contacts[$data['target']];
            $removed = $contacts[$data['source']];
            Source::where('contact_id', $removed->id)->update(['contact_id' => $kept->id]);
            $kept->phone = $kept->phone ?? $removed->phone;
            $kept->email = $kept->email ?? $removed->email;
            $kept->notes = implode("\n", array_filter([$kept->notes, 'Digabung dari '.$removed->name.' ('.$removed->id.')', $removed->notes]));
            $kept->save();
            $removed->delete();
            $this->log($request, 'menggabungkan kontak '.$data['source'].' ke '.$data['target'].'.');
        }, 3);

        return $this->data(['message' => 'Kontak digabung. Semua sumber dipertahankan.']);
    }

    public function sync(Request $request)
    {
        $records = [];
        foreach (PaymentDonor::select('id', 'name', 'phone', 'email')->cursor() as $row) {
            $records[] = ['id' => $row->id, 'name' => $row->name, 'phone' => $row->phone, 'email' => $row->email, 'source' => 'payment', 'role' => 'Donatur'];
        }
        foreach (ZakatAcademyProfile::whereNull('deleted_at')->with('user:id,name,email,is_superadmin')->get() as $row) {
            $teacher = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $row->userId)->where('modules.slug', 'academy')->whereIn('role', ['teacher', 'pengajar'])->exists();
            $records[] = ['id' => $row->id, 'name' => $row->user->name, 'phone' => $row->phone, 'email' => $row->user->email, 'source' => 'academy', 'role' => $row->user->is_superadmin ? 'Superadmin Academy' : ($teacher ? 'Pengajar Academy' : 'Peserta Academy')];
        }
        foreach (SarsipBeneficiary::whereNull('archived_at')->select('id', 'name', 'phone')->cursor() as $row) {
            $records[] = ['id' => $row->id, 'name' => $row->name, 'phone' => $row->phone, 'email' => null, 'source' => 'sarsip', 'role' => 'Penerima bantuan'];
        }
        foreach (LazsipProgramApplicant::select('id', 'name', 'contact')->cursor() as $row) {
            $records[] = ['id' => $row->id, 'name' => $row->name, 'phone' => $this->phone($row->contact), 'email' => $this->email($row->contact), 'source' => 'lazsip-pendaftar', 'role' => 'Pendaftar bantuan'];
        }
        foreach (LazsipBeneficiary::select('id', 'name')->cursor() as $row) {
            $records[] = ['id' => $row->id, 'name' => $row->name, 'phone' => null, 'email' => null, 'source' => 'lazsip-penerima', 'role' => 'Penerima bantuan'];
        }
        DB::transaction(function () use ($records, $request) {
            // A single database-owned module row serializes sync with another sync.
            DB::table('modules')->where('slug', 'sip')->lockForUpdate()->first();
            foreach ($records as $data) {
                $phone = $this->phone($data['phone']);
                $email = $this->email($data['email']);
                $source = Source::where('source', $data['source'])->where('source_id', $data['id'])->lockForUpdate()->first();
                $contact = $source ? Contact::where('id', $source->contactId)->lockForUpdate()->firstOrFail() : null;
                if (! $contact) {
                    $candidates = $phone || $email ? Contact::where(function ($q) use ($phone, $email) {
                        if ($phone) {
                            $q->where('phone', $phone);
                        } if ($email) {
                            $q->orWhere('email', $email);
                        }
                    })->lockForUpdate()->get() : collect();
                    $matches = $candidates->filter(fn ($c) => mb_strtolower(trim($c->name)) === mb_strtolower(trim($data['name'])) && (! $phone || ! $c->phone || $phone === $c->phone) && (! $email || ! $c->email || $email === $c->email));
                    $contact = $matches->count() === 1 ? $matches->first() : new Contact;
                    if (! $contact->exists) {
                        $contact->name = $data['name'];
                    } $contact->phone ??= $phone;
                    $contact->email ??= $email;
                    $contact->save();
                }
                $source ??= new Source;
                $source->contactId = $contact->id;
                $source->source = $data['source'];
                $source->sourceId = $data['id'];
                $source->name = $data['name'];
                $source->role = $data['role'];
                $source->phone = $phone;
                $source->email = $email;
                $source->syncedAt = now();
                $source->save();
            } $this->log($request, 'menyinkronkan '.count($records).' sumber kontak ERP.');
        }, 3);

        return $this->data(['message' => count($records).' sumber disinkronkan. Identitas ambigu tetap terpisah.']);
    }
}
