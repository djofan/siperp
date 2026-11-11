<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class Workflow
{
    public const RULES = [
        'submit' => [['draft', 'needs_data'], ['call_center', 'verifier', 'requester'], 'screening'],
        'screen_pass' => [['screening'], ['call_center'], 'review1'],
        'screen_reject' => [['screening'], ['call_center'], 'rejected_screening'],
        'request_data' => [['screening', 'review1'], ['call_center', 'approver', 'chair', 'survey_approver'], 'needs_data'],
        'review1_approve' => [['review1'], ['approver', 'chair', 'survey_approver'], 'survey_assignment'],
        'review1_reject' => [['review1'], ['approver', 'chair', 'survey_approver'], 'rejected_t1'],
        'assign_survey' => [['survey_assignment', 'survey_assigned'], ['call_center'], 'survey_assigned'],
        'survey_save' => [['survey_assigned'], ['verifier'], 'survey_assigned'],
        'survey_submit' => [['survey_assigned'], ['verifier'], 'survey_cc_review'],
        'survey_decline' => [['survey_assigned'], ['verifier'], 'survey_assignment'],
        'survey_review_save' => [['survey_cc_review'], ['call_center'], 'survey_cc_review'],
        'survey_review_submit' => [['survey_cc_review'], ['call_center'], 'survey_submitted'],
        'survey_review_withdraw' => [['survey_submitted', 'review2'], ['call_center'], 'survey_cc_review'],
        'survey_return' => [['survey_cc_review'], ['call_center'], 'survey_assigned'],
        'survey_address' => [['survey_assignment', 'survey_assigned', 'survey_cc_review'], ['call_center'], null],
        'survey_location' => [['survey_assignment', 'survey_assigned', 'survey_cc_review'], ['call_center', 'verifier'], null],
        'approve' => [['survey_submitted', 'review2', 'bypass_review'], ['approver', 'chair'], 'approved'],
        'review_reject' => [['survey_submitted', 'review2', 'bypass_review'], ['approver', 'chair'], 'rejected_t2'],
        'survey_again' => [['survey_submitted', 'review2'], ['approver', 'chair'], 'survey_assigned'],
        'assign_distributor' => [['approved', 'fund_ready', 'fund_submitted', 'fund_approved', 'disbursed'], ['call_center'], null],
        'fund_submit' => [['fund_ready'], ['fund_requester'], 'fund_submitted'],
        'fund_approve' => [['fund_submitted'], ['fund_requester'], 'fund_approved'],
        'fund_reject' => [['fund_submitted'], ['fund_requester'], 'review2'],
        'disburse' => [['fund_approved'], ['treasurer'], 'disbursed'],
        'handover' => [['disbursed'], ['verifier', 'treasurer'], 'completed'],
        'delivery_fail' => [['disbursed'], ['verifier', 'treasurer'], 'delivery_failed'],
        'return_funds' => [['delivery_failed'], ['treasurer'], 'returned'],
        'reopen' => [['rejected_screening', 'rejected_t1', 'rejected_t2', 'rejected_bypass', 'cancelled', 'returned'], ['approver', 'chair'], 'screening'],
        'cancel' => [['draft', 'needs_data', 'screening', 'review1', 'survey_assignment', 'survey_assigned', 'survey_cc_review', 'survey_submitted', 'bypass_review', 'approved', 'fund_ready'], ['call_center', 'verifier', 'requester'], 'cancelled'],
        'comment' => [[], ['call_center', 'approver', 'chair', 'verifier', 'fund_requester', 'treasurer', 'requester', 'observer', 'survey_approver'], null],
    ];

    public function perform(Request $request, string $id, string $action, ?array $manual = null): Application
    {
        abort_unless(isset(self::RULES[$action]), 404);
        if ($manual !== null) { app(Access::class)->allow($request, ['call_center']); abort_unless(isset(ManualProcesses::ROLES[$action]), 422); }
        $input = $request->validate(['version' => 'required|integer|min:1']);

        return DB::transaction(function () use ($request, $id, $action, $input, $manual) {
            $access = app(Access::class);
            $row = $access->find($request, $id, true);
            [$states, $roles, $next] = self::RULES[$action];
            $access->allow($request, $manual !== null ? ['call_center'] : $roles);
            abort_unless($row->version === $input['version'], 409, 'Data sudah berubah. Muat ulang sebelum melanjutkan.');
            abort_unless(! $states || in_array($row->status, $states, true), 409, 'Tindakan tidak sesuai tahap pengajuan.');
            $from = $row->status;
            $own = $row->created_by === $request->user()->id;
            $roles = match ($action) {
                'request_data' => $row->status === 'screening' ? ['call_center'] : ['approver', 'chair', 'survey_approver'],
                'survey_location' => ['call_center', ...($row->verifier_id === $request->user()->id ? ['verifier'] : [])],
                'handover', 'delivery_fail' => $row->distribution_type === 'direct' ? ['treasurer']
                    : ($row->distribution_type === 'verifier' && $row->distributor_id === $request->user()->id ? ['verifier'] : []),
                'submit' => $row->source === 'bypass' ? ['call_center', ...($own ? ['verifier'] : [])]
                    : ['call_center', ...($own ? ['requester'] : [])],
                'cancel' => ['call_center', ...($own && in_array($row->status, ['draft', 'needs_data'], true) ? ['verifier'] : []),
                    ...($own && in_array($row->status, ['draft', 'needs_data', 'screening'], true) ? ['requester'] : [])],
                default => $roles,
            };
            $role = $access->allow($request, $manual !== null ? ['call_center'] : $roles);
            if ($manual !== null) $role = 'admin'; // Authorization above; executor identity is never changed.
            FundingRequests::guardIndividualAction($request, $row, $action);
            if ($action === 'cancel' && $role === 'verifier') {
                abort_unless($row->created_by === $request->user()->id && in_array($row->status, ['draft', 'needs_data'], true), 403, 'Hanya draft pengajuan sendiri yang dapat dibatalkan.');
            }
            if ($action === 'cancel' && $role === 'requester') {
                abort_unless($row->created_by === $request->user()->id && in_array($row->status, ['draft', 'needs_data', 'screening'], true), 403, 'Petugas Pengajuan hanya dapat membatalkan pengajuan sendiri sebelum review Call Center selesai.');
            }
            if ($row->intake_role === 'requester' && in_array($action, ['screen_pass', 'screen_reject'], true) && $role !== 'admin') {
                abort_if($row->created_by === $request->user()->id, 403, 'Review Call Center harus dilakukan petugas lain.');
            }
            $reason = null;
            if (in_array($action, ['screen_reject', 'request_data', 'review1_reject', 'review_reject', 'survey_again', 'survey_return', 'survey_decline', 'fund_reject', 'delivery_fail', 'cancel', 'reopen', 'comment'], true)) {
                $reason = $request->validate(['reason' => 'required|string|min:5|max:5000'])['reason'];
            }
            if (in_array($action, ['survey_review_save', 'survey_review_submit', 'survey_return'], true)) {
                // Call Center may review their own survey when holding both roles.
                // Approval decisions still require an independent Approver.
            }
            if (in_array($action, ['review1_approve', 'review1_reject', 'approve', 'review_reject', 'survey_again'], true)) {
                abort_if($role !== 'admin' && ($row->created_by === $request->user()->id || $row->verifier_id === $request->user()->id), 403, 'Tidak boleh memutuskan pengajuan sendiri atau yang Anda survei.');
            }
            if ($action === 'request_data') {
                abort_if($row->status === 'screening' && ! in_array($role, ['admin', 'call_center'], true), 403);
                abort_if($row->status === 'review1' && ! in_array($role, ['admin', 'approver', 'chair', 'survey_approver'], true), 403);
            }
            if ($action === 'submit') {
                $complete = clone $request;
                $complete->merge(['applicant' => $row->applicant]);
                app(Intake::class)->validateApplicant($complete);
                abort_if($role === 'verifier' && ($row->source !== 'bypass' || $row->created_by !== $request->user()->id), 403);
                abort_if($role === 'requester' && ($row->source === 'bypass' || $row->created_by !== $request->user()->id), 403);
                if ($row->source === 'walk_in') {
                    $this->requiredDocuments($row, ['face' => 1, 'ktp' => 1]);
                }
                if ($row->source === 'bypass') {
                    $complete->validate([
                        'applicant.bypassKnowledge' => 'required|string|max:10000',
                        'applicant.bypassCondition' => 'required|string|max:10000',
                        'applicant.bypassHome' => 'required|string|max:10000',
                        'applicant.bypassExpenses' => 'required|string|max:10000',
                        'applicant.bypassEfforts' => 'required|string|max:10000',
                        'applicant.bypassNeeds' => 'required|string|max:10000',
                        'applicant.bypassRecommendation' => 'required|string|max:10000',
                    ]);
                }
                $next = $this->intakeStage($row);
            }
            if ($action === 'assign_survey') {
                $address = trim($request->validate(['surveyAddress' => 'required|string|min:10|max:1000'])['surveyAddress']);
                abort_if(mb_strlen($address) < 10, 422, 'Lengkapi alamat survei minimal 10 karakter.');
                $reason = $request->validate(['reason' => 'sometimes|nullable|string|min:5|max:5000'])['reason'] ?? null;
                $verifier = $manual !== null ? ($manual['actorId'] ?? null) : $request->validate(['verifierId' => 'required|string'])['verifierId'];
                if ($verifier) abort_unless($access->assigned($verifier, 'verifier'), 422, 'Pilih Verifikator aktif dari modul ini.');
                $row->verifier_id = $verifier;
                $meta = $row->manual_process ?? [];
                if ($manual !== null) $meta['verifier'] = $manual;
                else unset($meta['verifier'], $meta['distributor']);
                $row->manual_process = $meta;
                if (($row->survey_location['address'] ?? null) !== $address) $row->survey_location = ['address' => $address];
            }
            if ($action === 'survey_decline') {
                abort_if($role !== 'admin' && $row->verifier_id !== $request->user()->id, 403);
                $row->verifier_id = null;
            }
            if ($action === 'survey_address') {
                $address = trim($request->validate(['surveyAddress' => 'required|string|min:10|max:1000'])['surveyAddress']);
                abort_if(mb_strlen($address) < 10, 422, 'Lengkapi alamat survei minimal 10 karakter.');
                if (($row->survey_location['address'] ?? null) !== $address) $row->survey_location = ['address' => $address];
            }
            if ($action === 'survey_location') {
                $location = $request->validate(['latitude' => 'required|numeric|between:-90,90', 'longitude' => 'required|numeric|between:-180,180']);
                $row->survey_location = array_replace($row->survey_location ?? [], $location);
            }
            if ($action === 'survey_return') {
                abort_unless(($row->verifier_id && $access->assigned($row->verifier_id, 'verifier')) || ($manual !== null && !empty($row->manual_process['verifier'])), 422, 'Verifikator penugasan harus masih aktif.');
            }
            if (in_array($action, ['survey_save', 'survey_submit', 'survey_review_save', 'survey_review_submit'], true)) {
                $review = in_array($action, ['survey_review_save', 'survey_review_submit'], true);
                $draft = in_array($action, ['survey_save', 'survey_review_save'], true);
                abort_if(! $review && $role !== 'admin' && $row->verifier_id !== $request->user()->id, 403);
                $corrections = clone $request;
                if ($review) {
                    $request->validate(['survey' => 'sometimes|array', 'applicant' => 'sometimes|array']);
                    $corrections->merge(['survey' => array_replace($row->survey ?? [], $request->input('survey', [])),
                        'applicant' => array_replace($row->applicant ?? [], $request->input('applicant', []))]);
                }
                $surveyRules = ['survey' => 'required|array', 'survey.date' => 'required|date|before_or_equal:today',
                    'survey.hasSktm' => 'required|boolean', 'survey.sktmExplanation' => 'nullable|string|max:5000',
                    'survey.background' => 'required|string|max:10000', 'survey.currentCondition' => 'required|string|max:10000',
                    'survey.needs' => 'required|string|max:10000', 'survey.efforts' => 'required|string|max:5000',
                    'survey.homeObservation' => 'required|string|max:10000', 'survey.stayDuration' => 'required|numeric|min:0',
                    'survey.stayUnit' => 'required|in:bulan,tahun', 'survey.socialRecord' => 'required|string|max:10000',
                    'survey.recommendation' => 'required|in:layak,tidak_layak', 'survey.suggestions' => 'nullable|string|max:5000',
                    'survey.notes' => 'nullable|string|max:5000', 'survey.contacts' => 'sometimes|array|max:20',
                    'survey.contacts.*.name' => 'required|string|max:191', 'survey.contacts.*.relationship' => 'required|string|max:191',
                    'survey.contacts.*.phone' => 'required|string|max:30', 'survey.latitude' => 'nullable|numeric|between:-90,90',
                    'survey.longitude' => 'nullable|numeric|between:-180,180'];
                if ($draft) {
                    foreach ($surveyRules as $field => $rule) {
                        if ($field !== 'survey') {
                            $surveyRules[$field] = str_replace('required|', 'sometimes|nullable|', $rule);
                        }
                    }
                }
                $survey = array_replace($row->survey ?? [], $corrections->validate($surveyRules)['survey']);
                abort_if(! $draft && ! ($survey['hasSktm'] ?? false) && empty($survey['sktmExplanation']), 422, 'Jelaskan alasan belum memiliki SKTM.');
                if (! $draft && $row->source === 'online') {
                    $this->requiredDocuments($row, ['ktp' => 1, 'kk' => 1]);
                }
                if ($action === 'survey_submit') {
                    $this->requiredDocuments($row, ['survey_recipient' => 1, 'survey_front' => 1, 'survey_inside' => 2, 'survey_environment' => 1]);
                    $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
                    abort_if(DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')->where('kind', 'like', 'survey_%')->count() < ($settings['minimumSurveyPhotos'] ?? 5), 422, 'Jumlah foto survei belum memenuhi minimum.');
                    DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')->where('kind', 'like', 'survey_%')->whereNull('used_at')->update(['used_at' => now()]);
                }
                if ($action === 'survey_review_submit') {
                    // CC corrects the existing survey; its consumed evidence remains valid.
                    DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')->where('kind', 'like', 'survey_%')->whereNull('used_at')->update(['used_at' => now()]);
                    $this->requiredDocuments($row, ['survey_recipient' => 1, 'survey_front' => 1, 'survey_inside' => 2, 'survey_environment' => 1], consumed: true);
                    $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
                    abort_if(DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')
                        ->where('kind', 'like', 'survey_%')->whereNotNull('used_at')->count() < ($settings['minimumSurveyPhotos'] ?? 5), 422, 'Jumlah foto survei belum memenuhi minimum.');
                }
                $row->survey = $survey;
                if ($request->has('applicant') || ($review && ! $draft)) {
                    $corrected = app(Intake::class)->validateApplicant($corrections, $review && $draft);
                    $row->applicant = $corrected;
                    $row->name = $corrected['name'];
                    $row->nik_hash = app(Intake::class)->nikHash($corrected['nik']);
                }
            }
            if ($action === 'approve') {
                $row->amount = $request->validate(['amount' => 'required|integer|min:1|max:9000000000000'])['amount'];
                if ($row->verifier_id && $access->assigned($row->verifier_id, 'verifier')) {
                    $row->distributor_id = $row->verifier_id;
                    $row->distribution_type = 'verifier';
                    $next = 'fund_ready';
                }
                if (!$row->verifier_id && !empty($row->manual_process['verifier'])) {
                    $row->manual_process = array_replace($row->manual_process, ['distributor' => $row->manual_process['verifier']]);
                    $row->distribution_type = 'manual'; $row->distributor_id = null; $next = 'fund_ready';
                }
                // Bypass without a survey still needs an explicit accountable distributor.
            }
            if ($action === 'review_reject' && $from === 'bypass_review') {
                $next = 'rejected_bypass';
            }
            if ($action === 'reopen') {
                $next = $this->intakeStage($row);
                $row->amount = null;
                $row->verifier_id = null;
                $row->distributor_id = null;
                $row->distribution_type = null;
                $row->survey = null;
                $row->handover = null;
                $row->fund_reference = null;
                $row->disbursed_at = null;
                $row->completed_at = null;
            }
            if ($action === 'assign_distributor' && $manual !== null) {
                abort_if($from === 'disbursed', 409, 'Catat pengembalian dana sebelum mengganti penyalur.');
                $row->distributor_id = $manual['actorId'] ?? null;
                $row->distribution_type = $row->distributor_id ? 'verifier' : 'manual';
                $row->manual_process = array_replace($row->manual_process ?? [], ['distributor' => $manual]);
                $next = $from === 'approved' ? 'fund_ready' : $from;
            }
            if ($action === 'assign_distributor' && $manual === null) {
                $input = $request->validate(['distributionType' => ['required', Rule::in($row->source === 'bypass' ? ['verifier', 'direct'] : ['verifier'])], 'distributorId' => 'nullable|string']);
                $old = $row->distributor_id;
                if ($input['distributionType'] === 'verifier') {
                    abort_unless($access->assigned($input['distributorId'] ?? '', 'verifier'), 422, 'Pilih Verifikator penyalur yang aktif.');
                    $row->distributor_id = $input['distributorId'];
                } else {
                    $row->distributor_id = null;
                }
                $row->distribution_type = $input['distributionType'];
                if ($from === 'disbursed') {
                    $this->consumeEvidence($row, 'return');
                    $reason = $request->validate(['reason' => 'required|string|min:5|max:5000'])['reason'];
                    $next = 'fund_approved';
                    $row->disbursed_at = null;
                } else {
                    $next = $from === 'approved' ? 'fund_ready' : $from;
                }
                app(Journal::class)->notify($row, 'Penyalur diperbarui', ['fund_requester', 'treasurer'], [$old, $row->distributor_id]);
            }
            if ($action === 'fund_submit') {
                $row->fund_reference = $request->validate(['reference' => 'nullable|string|max:191'])['reference'] ?? null;
            }
            if ($action === 'disburse') {
                $transfer = $request->validate(['transferDate' => 'required|date|before_or_equal:today', 'transferAmount' => 'required|integer|min:1', 'account' => 'required|string|max:191']);
                abort_unless((int) $transfer['transferAmount'] === $row->amount, 422, 'Nominal pencairan harus sama dengan nominal ditetapkan.');
                if (DB::table('bantuan_documents')->where('application_id', $row->id)->where('kind', 'transfer')->whereNull('deleted_at')->whereNull('used_at')->exists()) {
                    $this->consumeEvidence($row, 'transfer');
                }
                $row->disbursed_at = $transfer['transferDate'];
            }
            if (in_array($action, ['handover', 'delivery_fail'], true)) {
                if ($role !== 'admin') {
                    abort_unless(($role === 'verifier' && $row->distribution_type === 'verifier' && $row->distributor_id === $request->user()->id)
                        || ($role === 'treasurer' && $row->distribution_type === 'direct'), 403);
                }
            }
            if ($action === 'return_funds') {
                $this->consumeEvidence($row, 'return');
            }
            if ($action === 'handover') {
                $handover = $request->validate(['handover' => 'required|array', 'handover.method' => 'required|in:tunai,transfer',
                    'handover.date' => 'required|date|before_or_equal:today', 'handover.amount' => 'required|integer|min:1',
                    'handover.differenceReason' => 'nullable|string|max:5000', 'handover.notes' => 'nullable|string|max:5000'])['handover'];
                $this->requiredDocuments($row, ['handover' => 1, 'certificate' => 1]);
                $row->handover = $handover;
                $row->completed_at = $handover['date'];
            }
            if ($manual !== null) {
                $meta = $row->manual_process ?? [];
                $meta['last'] = ['action' => $action, ...$manual];
                if (in_array($action, ['survey_save', 'survey_submit'], true)) {
                    $assigned = $meta['verifier'] ?? null;
                    if ($row->verifier_id) abort_unless(($manual['actorId'] ?? null) === $row->verifier_id, 422, 'Pelaksana harus sesuai Verifikator yang ditugaskan.');
                    elseif ($assigned) abort_unless($manual['name'] === $assigned['name'], 422, 'Nama pelaksana harus sesuai penugasan survei.');
                    else abort(422, 'Catat penugasan Verifikator terlebih dahulu.');
                    $meta['verifier'] = $manual;
                }
                if ($action === 'handover') {
                    if ($row->distributor_id) abort_unless(($manual['actorId'] ?? null) === $row->distributor_id, 422, 'Pelaksana harus sesuai penyalur yang ditugaskan.');
                    elseif (!empty($meta['distributor'])) abort_unless($manual['name'] === $meta['distributor']['name'], 422, 'Nama pelaksana harus sesuai penyalur yang ditugaskan.');
                    else abort(422, 'Tentukan penyalur sebelum mencatat penyerahan.');
                }
                if ($action === 'disburse') abort_unless($transfer['transferDate'] === $manual['date'], 422, 'Tanggal pelaksanaan dan transfer harus sama.');
                if ($action === 'handover') abort_unless($handover['date'] === $manual['date'], 422, 'Tanggal pelaksanaan dan penyerahan harus sama.');
                if ($action === 'survey_submit') abort_unless($row->survey['date'] === $manual['date'], 422, 'Tanggal pelaksanaan dan survei harus sama.');
                $row->manual_process = $meta;
            }
            $before = $row->getOriginal();
            $row->status = $next ?? $from;
            $row->version++;
            $row->save();
            // Store only validated business inputs; never authentication tokens or file contents.
            if (in_array($action, ['survey_review_save', 'survey_review_submit'], true) && $access->has($request, ['call_center'])) {
                $profile = \App\Modules\Bantuan\Models\MustahiqProfile::whereKey($row->nik_hash)->lockForUpdate()->first()
                    ?? new \App\Modules\Bantuan\Models\MustahiqProfile;
                $oldProfile = $profile->applicant;
                $profile->forceFill(['nik_hash' => $row->nik_hash, 'name' => $row->name, 'applicant' => $row->applicant,
                    'updated_by' => $request->user()->id, 'version' => ($profile->version ?? 0) + 1])->save();
                app(Journal::class)->record($request, $row, 'sync_mustahiq', $from, ['before' => $oldProfile, 'after' => $row->applicant]);
            }
            $details = ['manual' => $manual, 'reason' => $reason, 'amount' => $row->amount, 'verifierId' => $row->verifier_id, 'distributorId' => $row->distributor_id,
                'surveyLocation' => $row->survey_location, 'previousSurveyLocation' => $before['survey_location'] ?? null,
                'previousVerifierId' => $before['verifier_id'] ?? null, 'previousDistributorId' => $before['distributor_id'] ?? null,
                'previousDistributionType' => $before['distribution_type'] ?? null, 'distributionType' => $row->distribution_type,
                'previousAmount' => $before['amount'] ?? null, 'reference' => $row->fund_reference, 'previousSurvey' => $before['survey'] ?? null, 'survey' => $row->survey, 'handover' => $row->handover,
                'previousApplicant' => $before['applicant'] ?? null, 'applicant' => $row->applicant];
            if ($action === 'disburse') {
                $details['transfer'] = $transfer;
            }
            app(Journal::class)->record($request, $row, $action, $from, $details);
            $targets = match ($row->status) {
                'screening' => ['call_center'],
                'review1' => ['approver', 'chair', 'survey_approver'],
                'survey_submitted', 'bypass_review', 'review2' => ['approver', 'chair'],
                'survey_cc_review' => ['call_center'],
                'survey_assignment', 'approved', 'completed' => ['call_center', 'approver'],
                'fund_ready', 'fund_submitted' => ['fund_requester'], 'fund_approved' => ['treasurer'], default => [],
            };
            if ($action === 'fund_reject') $targets[] = 'call_center';
            if ($action === 'survey_decline') $targets = ['call_center'];
            // Notify the next responsible team; field staff only receive events affecting their task.
            $users = match ($action) {
                'assign_survey', 'survey_return', 'survey_again', 'survey_address' => [$row->verifier_id],
                'assign_distributor', 'disburse' => [$row->distributor_id],
                'request_data' => [$row->created_by],
                'cancel', 'screen_reject', 'review1_reject', 'review_reject', 'handover' => [$row->created_by, $row->verifier_id, $row->distributor_id],
                'comment' => [$row->created_by, $row->verifier_id, $row->distributor_id],
                default => [],
            };
            if (in_array($action, ['assign_survey', 'survey_return', 'survey_again', 'survey_address', 'request_data', 'comment'], true)) $targets = [];
            // Draft saves and map adjustments are not new tasks.
            if (in_array($action, ['survey_save', 'survey_review_save', 'survey_location'], true)) { $targets = []; $users = []; }
            if ($action === 'assign_survey' && !empty($before['verifier_id']) && $before['verifier_id'] !== $row->verifier_id) {
                app(Journal::class)->notify($row, 'Tugas survei Anda dialihkan ke petugas lain', [], [$before['verifier_id']]);
            }
            app(Journal::class)->notify($row, $action, $targets, $users, reason: $reason);

            return $row;
        }, 3);
    }

    private function intakeStage(Application $row): string
    {
        if ($row->source === 'bypass') return 'bypass_review';
        if ($row->intake_role === 'requester') return 'review1';
        if (in_array($row->intake_role, ['call_center', 'admin'], true)) return 'review1';
        return $row->source === 'online' ? 'review1' : 'screening';
    }

    private function consumeEvidence(Application $row, string $kind): void
    {
        $doc = DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')->where('kind', $kind)->whereNull('used_at')->lockForUpdate()->first();
        abort_unless($doc, 422, 'Unggah bukti baru untuk '.$kind.'. Bukti sebelumnya tidak dapat digunakan ulang.');
        DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')->where('kind', $kind)->whereNull('used_at')->update(['used_at' => now()]);
    }

    private function requiredDocuments(Application $row, array $requirements, bool $unused = false, bool $consumed = false): void
    {
        foreach ($requirements as $kind => $count) {
            abort_if(DB::table('bantuan_documents')->where('application_id', $row->id)->whereNull('deleted_at')->where('kind', $kind)
                ->when($unused, fn ($q) => $q->whereNull('used_at'))->when($consumed, fn ($q) => $q->whereNotNull('used_at'))->count() < $count, 422, 'Dokumen wajib belum lengkap: '.$kind.' (minimal '.$count.').');
        }
    }
}
