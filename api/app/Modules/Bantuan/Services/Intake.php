<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Intake
{
    public function nikHash(string $nik): string
    {
        return hash_hmac('sha256', $nik, config('app.key'));
    }

    public function validateApplicant(Request $request, bool $draft = false): array
    {
        $rules = [
            'applicant' => 'required|array', 'applicant.name' => 'required|string|max:191', 'applicant.nik' => 'required|digits:16',
            'applicant.intakeType' => 'nullable|in:new,returning',
            'applicant.birthPlace' => 'required|string|max:191', 'applicant.birthDate' => 'required|date|before_or_equal:today',
            'applicant.gender' => 'required|in:laki_laki,perempuan', 'applicant.maritalStatus' => 'required|in:Menikah,Duda,Janda,Janda mati,Belum menikah',
            'applicant.street' => 'required|string|max:500', 'applicant.rtRw' => 'required|string|max:30',
            'applicant.village' => 'required|string|max:191', 'applicant.district' => 'required|string|max:191', 'applicant.city' => 'required|string|max:191',
            'applicant.housing' => 'required|string|max:191', 'applicant.rent' => 'nullable|integer|min:0|max:9000000000000',
            'applicant.job' => 'required|string|max:191', 'applicant.income' => 'required|integer|min:0|max:9000000000000',
            'applicant.incomePeriod' => 'required|in:hari,pekan,bulan', 'applicant.dependentCount' => 'required|integer|min:0|max:100',
            'applicant.dependents' => 'nullable|string|max:5000', 'applicant.phone' => 'required|string|max:30',
            'applicant.prayer' => 'required|in:Ya,Jarang,Tidak', 'applicant.smoking' => 'required|in:Ya,Jarang,Tidak',
            'applicant.previousAid' => 'required|boolean', 'applicant.previousAidNotes' => 'nullable|string|max:5000',
            'applicant.publicationConsent' => 'required|boolean', 'applicant.hasSktm' => 'required|boolean',
            'applicant.willingSktm' => $request->input('applicant.hasSktm') === false || $request->input('applicant.hasSktm') === 0 || $request->input('applicant.hasSktm') === '0'
                ? 'required|boolean' : 'exclude',
            'applicant.informationSource' => 'required|string|max:191', 'applicant.problem' => 'required|string|max:10000',
        ];
        if (is_array($request->input('applicant.dependents'))) {
            $rules['applicant.dependents'] = 'nullable|array|max:100';
            $rules['applicant.dependents.*'] = 'array:name,relationship,gender,age,status';
            $rules['applicant.dependents.*.gender'] = 'required|in:laki_laki,perempuan';
            $rules['applicant.dependents.*.name'] = 'required|string|max:191';
            $rules['applicant.dependents.*.relationship'] = 'required|string|max:100';
            $rules['applicant.dependents.*.age'] = 'required|integer|min:0|max:120';
            $rules['applicant.dependents.*.status'] = 'required|in:Belum sekolah,Sekolah,Kuliah,Bekerja,Belum bekerja,Tidak bekerja,Lainnya';
        }
        if ($draft) {
            foreach ($rules as $field => $rule) {
                if (! in_array($field, ['applicant', 'applicant.name', 'applicant.nik'], true)) {
                    $rules[$field] = str_replace('required|', 'sometimes|nullable|', $rule);
                }
            }
        }

        return $request->validate($rules)['applicant'];
    }

    public function save(Request $request, ?string $id = null): Application
    {
        $access = app(Access::class);
        $access->allow($request, ['call_center', 'verifier']);
        $draft = $request->boolean('draft');
        $request->validate(['draftKey' => 'nullable|uuid']);
        if (! $id && $request->filled('draftKey')) {
            $existing = Application::find($request->input('draftKey'));
            if ($existing) {
                abort_unless($existing->created_by === $request->user()->id && in_array($existing->status, ['draft', 'needs_data'], true), 409, 'Draft sudah diproses atau bukan milik akun ini.');
                return $existing;
            }
        }
        $applicant = $this->validateApplicant($request, $draft);
        $rules = ['source' => 'required|in:online,walk_in,bypass', 'program' => 'required|string|max:191',
            'region' => 'nullable|string|max:191', 'bypassReason' => 'nullable|string|max:5000',
        ];
        if ($draft) {
            $rules['region'] = 'nullable|string|max:191';
        }
        $data = $request->validate($rules);
        $data['region'] = $data['region'] ?? '';
        $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
        abort_unless(in_array($data['program'], $settings['programs'], true), 422, 'Program tidak terdaftar.');
        abort_if(! $id && $data['source'] === 'bypass' && (! $access->bypass($request) || strlen(trim($data['bypassReason'] ?? '')) < 5), 422, 'Jalur langsung memerlukan izin dan alasan minimal 5 karakter.');
        abort_if($access->role($request) === 'verifier' && $data['source'] !== 'bypass', 403);

        return DB::transaction(function () use ($request, $id, $data, $applicant, $access, $draft) {
            $row = $id ? $access->find($request, $id, true) : new Application;
            if ($id) {
                abort_if($draft && ! in_array($row->status, ['draft', 'needs_data'], true), 409, 'Draft hanya tersedia sebelum pengajuan diproses.');
                $sourceChanged = $data['source'] !== $row->source;
                abort_if($sourceChanged && (! in_array($row->status, ['draft', 'needs_data'], true)
                    || ! in_array($row->source, ['online', 'walk_in'], true)
                    || ! in_array($data['source'], ['online', 'walk_in'], true)), 422,
                    'Sumber WhatsApp / datang langsung hanya dapat diubah selama draft atau perlu dilengkapi. Jalur khusus tidak dapat diubah.');
                abort_unless(in_array($row->status, ['draft', 'needs_data', 'screening'], true), 409, 'Data hanya dapat diedit sebelum screening selesai.');
                abort_if($access->role($request) === 'verifier' && $row->created_by !== $request->user()->id, 403);
                abort_unless((int) $request->input('version') === $row->version, 409, 'Data sudah berubah. Muat ulang.');
            }
            $before = $id ? $row->applicant : null;
            $sourceBefore = $id ? $row->source : null;
            if (! $id) {
                $row->id = $request->input('draftKey') ?: (string) Str::uuid();
                $row->number = 'BNT-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
                $row->created_by = $request->user()->id;
                $row->status = 'draft';
                $row->version = 0;
            }
            $row->forceFill(['name' => $applicant['name'], 'nik_hash' => $this->nikHash($applicant['nik']), 'applicant' => $applicant,
                'source' => $data['source'], 'program' => $data['program'], 'region' => $data['region'],
                'bypass_reason' => $data['bypassReason'] ?? null, 'version' => $row->version + 1])->save();
            app(Journal::class)->record($request, $row, $id ? 'edit_intake' : 'create', $id ? $row->status : null, [
                'before' => $before, 'after' => $applicant, 'source' => $row->source, 'sourceBefore' => $sourceBefore, 'bypassReason' => $row->bypass_reason,
                'program' => $row->program, 'region' => $row->region,
            ]);

            return $row;
        }, 3);
    }
}
