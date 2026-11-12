<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Rules\PhoneNumber;
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
            'applicant.requestCategory' => 'nullable|in:perorangan,renovasi rumah,air bersih,santunan rutin,bantuan janda,lainnya',
            'applicant.customTitle' => 'nullable|string|max:10000',
            'applicant.customBeneficiaries' => 'nullable|string|max:10000',
            'applicant.customLocation' => 'nullable|string|max:10000',
            'applicant.customBudget' => 'nullable|string|max:10000',
            'applicant.customSchedule' => 'nullable|string|max:10000',
            'applicant.customOutcome' => 'nullable|string|max:10000',

            'applicant.assessment_sktmExplanation' => 'nullable|string|max:10000',
            'applicant.assessment_background' => 'nullable|string|max:10000',
            'applicant.assessment_currentCondition' => 'nullable|string|max:10000',
            'applicant.assessment_needs' => 'nullable|string|max:10000',
            'applicant.assessment_efforts' => 'nullable|string|max:10000',
            'applicant.assessment_homeObservation' => 'nullable|string|max:10000',
            'applicant.assessment_socialRecord' => 'nullable|string|max:10000',
            'applicant.assessment_suggestions' => 'nullable|string|max:10000',
            'applicant.assessment_notes' => 'nullable|string|max:10000',
            'applicant.assessment_date' => 'nullable|date|before_or_equal:today',
            'applicant.assessment_hasSktm' => 'nullable|boolean',
            'applicant.assessment_stayDuration' => 'nullable|numeric|min:0',
            'applicant.assessment_stayUnit' => 'nullable|in:bulan,tahun',
            'applicant.assessment_recommendation' => 'nullable|in:layak,tidak_layak',

            'applicant.reporterName' => 'nullable|string|max:191',
            'applicant.reporterRelationship' => 'nullable|string|max:191',
            'applicant.reporterOrganization' => 'nullable|string|max:191',
            'applicant.reporterAddress' => 'nullable|string|max:1000',
            'applicant.reporterPhone' => ['nullable', 'string', 'max:30', new PhoneNumber],
            'applicant.reporterProgram' => 'nullable|string|max:191',
            'applicant.province' => 'nullable|string|max:191',
            'applicant.provinceId' => 'nullable|string|max:20',
            'applicant.cityId' => 'nullable|string|max:20',
            'applicant.districtId' => 'nullable|string|max:20',
            'applicant.villageId' => 'nullable|string|max:20',
            'applicant.rentPeriod' => 'nullable|in:bulan,tahun',
            'applicant.bypassKnowledge' => 'nullable|string|max:10000',
            'applicant.bypassCondition' => 'nullable|string|max:10000',
            'applicant.bypassHome' => 'nullable|string|max:10000',
            'applicant.bypassExpenses' => 'nullable|string|max:10000',
            'applicant.bypassEfforts' => 'nullable|string|max:10000',
            'applicant.bypassNeeds' => 'nullable|string|max:10000',
            'applicant.bypassRecommendation' => 'nullable|string|max:10000',
            'applicant' => 'required|array', 'applicant.name' => 'required|string|max:191', 'applicant.nik' => 'required|digits:16',
            'applicant.intakeType' => 'nullable|in:new,returning',
            'applicant.birthPlace' => 'required|string|max:191', 'applicant.birthDate' => 'required|date|before_or_equal:today',
            'applicant.gender' => 'required|in:laki_laki,perempuan', 'applicant.maritalStatus' => 'required|in:Menikah,Duda,Janda,Janda mati,Belum menikah',
            'applicant.street' => 'required|string|max:500', 'applicant.rtRw' => 'nullable|string|max:30',
            'applicant.village' => 'nullable|string|max:191', 'applicant.district' => 'nullable|string|max:191', 'applicant.city' => 'nullable|string|max:191',
            'applicant.housing' => 'required|string|max:191', 'applicant.rent' => 'nullable|integer|min:0|max:9000000000000',
            'applicant.job' => 'required|string|max:191', 'applicant.income' => 'required|integer|min:0|max:9000000000000',
            'applicant.incomePeriod' => 'required|in:hari,pekan,bulan', 'applicant.dependentCount' => 'required|integer|min:0|max:100',
            'applicant.dependents' => 'nullable|string|max:5000', 'applicant.phone' => ['required', 'string', 'max:30', new PhoneNumber],
            'applicant.prayer' => 'required|in:Ya,Jarang,Tidak', 'applicant.smoking' => 'required|in:Ya,Jarang,Tidak',
            'applicant.previousAid' => 'required|boolean', 'applicant.previousAidNotes' => 'nullable|string|max:5000',
            'applicant.publicationConsent' => 'required|boolean', 'applicant.hasSktm' => 'required|boolean',
            'applicant.willingSktm' => $request->input('applicant.hasSktm') === false || $request->input('applicant.hasSktm') === 0 || $request->input('applicant.hasSktm') === '0'
                ? 'required|boolean' : 'exclude',
            'applicant.informationSource' => 'required|string|max:191', 'applicant.problem' => 'required|string|max:10000',
            'applicant.applicationNotes' => 'nullable|string|max:10000',
            'applicant.latitude' => 'nullable|required_with:applicant.longitude|numeric|between:-90,90',
            'applicant.longitude' => 'nullable|required_with:applicant.latitude|numeric|between:-180,180',
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
                    $rules[$field] = is_array($rule)
                        ? array_values(array_unique(['sometimes', 'nullable', ...array_filter($rule, fn ($part) => $part !== 'required')], SORT_REGULAR))
                        : str_replace('required|', 'sometimes|nullable|', $rule);
                }
            }
        }

        return $request->validate($rules)['applicant'];
    }

    public function save(Request $request, ?string $id = null): Application
    {
        $access = app(Access::class);
        $access->allow($request, ['call_center', 'verifier', 'requester']);
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
        abort_unless(in_array($data['program'], [...$settings['programs'], 'Lainnya'], true), 422, 'Program tidak terdaftar.');
        abort_if(! $id && $data['source'] === 'bypass' && (! $access->bypass($request) || strlen(trim($data['bypassReason'] ?? '')) < 5), 422, 'Jalur langsung memerlukan izin dan alasan minimal 5 karakter.');
        $access->allow($request, $id ? ['call_center', 'verifier', 'requester'] : ($data['source'] === 'bypass' ? ['call_center', 'verifier'] : ['call_center', 'requester']));

        return DB::transaction(function () use ($request, $id, $data, $applicant, $access, $draft) {
            $row = $id ? $access->find($request, $id, true) : new Application;
            if ($id) {
                abort_if($draft && ! in_array($row->status, ['draft', 'needs_data'], true), 409, 'Draft hanya tersedia sebelum pengajuan diproses.');
                $sourceChanged = $data['source'] !== $row->source;
                abort_if($sourceChanged && (! in_array($row->status, ['draft', 'needs_data'], true)
                    || ! in_array($row->source, ['online', 'walk_in'], true)
                    || ! in_array($data['source'], ['online', 'walk_in'], true)), 422,
                    'Sumber WhatsApp / datang langsung hanya dapat diubah selama draft atau perlu dilengkapi. Jalur khusus tidak dapat diubah.');
                $ownVerifier = $row->created_by === $request->user()->id && $access->has($request, ['verifier']) && in_array($row->status, ['draft', 'needs_data', 'screening', 'review1', 'survey_assignment', 'survey_assigned', 'bypass_review'], true);
                abort_if($row->created_by !== $request->user()->id && !$access->has($request, ['call_center']) && $access->role($request) !== 'admin', 403, 'Anda hanya dapat memperbaiki pengajuan yang Anda buat sendiri.');
                abort_unless($ownVerifier || $access->has($request, ['call_center']) || $access->role($request) === 'admin' || in_array($row->status, ['draft', 'needs_data', 'screening'], true), 409, 'Perubahan pada tahap ini hanya dapat dilakukan Call Center.');
                $own = $row->created_by === $request->user()->id;
                $access->allow($request, ['call_center', ...($ownVerifier ? ['verifier'] : []),
                    ...($own && $row->source !== 'bypass' && in_array($row->status, ['draft', 'needs_data'], true) ? ['requester'] : [])]);
                abort_unless((int) $request->input('version') === $row->version, 409, 'Data sudah berubah. Muat ulang.');
            }
            $before = $id ? $row->applicant : null;
            $sourceBefore = $id ? $row->source : null;
            if (! $id) {
                $row->id = $request->input('draftKey') ?: (string) Str::uuid();
                $row->number = 'BNT-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
                $row->created_by = $request->user()->id;
                $row->intake_role = $access->role($request);
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
