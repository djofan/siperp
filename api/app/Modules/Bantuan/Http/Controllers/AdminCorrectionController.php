<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Models\FundingRequest;
use App\Modules\Bantuan\Models\FundingRequestItem;
use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Journal;
use App\Modules\Bantuan\Services\Workflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminCorrectionController
{
    public function __invoke(Request $request, string $id, Access $access, Journal $journal)
    {
        abort_unless($access->has($request, ['admin']), 403, 'Koreksi ini hanya untuk Superadmin dan admin modul Bantuan.');
        $access->allow($request, ['admin']);
        $states = array_unique(array_merge(...array_column(Workflow::RULES, 0)));
        $data = $request->validate([
            'version' => 'required|integer|min:1', 'reason' => 'required|string|min:10|max:5000',
            'confirmation' => 'required|string', 'releaseFundingGroup' => 'boolean',
            'status' => ['required', Rule::in($states)], 'source' => 'sometimes|in:online,walk_in,bypass',
            'fundReference' => 'sometimes|nullable|string|max:191',
            'program' => 'sometimes|required|string|max:191', 'region' => 'sometimes|nullable|string|max:191',
            'manualVerifierName' => 'nullable|string|max:191', 'manualVerifierPhone' => 'nullable|string|max:32',
            'manualDistributorName' => 'nullable|string|max:191', 'manualDistributorPhone' => 'nullable|string|max:32',
            'transfer' => 'sometimes|array:bank,account,recipientName,recipientRelationship', 'transfer.*' => 'nullable|string|max:191', 'amount' => 'nullable|integer|min:1|max:9000000000000',
            'verifierId' => 'nullable|string|max:191', 'distributorId' => 'nullable|string|max:191',
            'disbursedAt' => 'nullable|date|before_or_equal:today', 'completedAt' => 'nullable|date|before_or_equal:today',
            'survey' => 'nullable|array', 'survey.*' => 'nullable',
            'handover' => 'nullable|array:date,method,amount,notes,reason',
            'handover.date' => 'nullable|date|before_or_equal:today', 'handover.method' => 'nullable|in:tunai,transfer',
            'handover.amount' => 'nullable|integer|min:1|max:9000000000000', 'handover.notes' => 'nullable|string|max:5000', 'handover.reason' => 'nullable|string|max:5000',
        ]);
        // Cap survey fields using the normal draft validator, without requiring a resurvey.
        if (isset($data['survey'])) {
            $allowed = ['date','sunnahKnowledge','hasSktm','sktmExplanation','background','currentCondition','needs','efforts','homeObservation','stayDuration','stayUnit','socialRecord','recommendation','suggestions','notes','contacts','latitude','longitude'];
            abort_if(array_diff(array_keys($data['survey']), $allowed), 422, 'Kolom survei tidak dikenal.');
            $request->validate(['survey.date'=>'nullable|date|before_or_equal:today','survey.sunnahKnowledge'=>'nullable|in:Ya,Tidak,Sudah mulai',
                'survey.hasSktm'=>'nullable|boolean','survey.stayDuration'=>'nullable|numeric|min:0','survey.stayUnit'=>'nullable|in:bulan,tahun',
                'survey.latitude'=>'nullable|numeric|between:-90,90','survey.longitude'=>'nullable|numeric|between:-180,180','survey.recommendation'=>'nullable|in:layak,tidak_layak','survey.contacts'=>'nullable|array|max:20','survey.contacts.*.name'=>'required|string|max:191',
                'survey.contacts.*.relationship'=>'nullable|string|max:191','survey.contacts.*.phone'=>'nullable|string|max:32']);
            foreach ($data['survey'] as $key => $value) if (!in_array($key, ['contacts','hasSktm','stayDuration','latitude','longitude'], true)) abort_if($value !== null && (!is_string($value) || mb_strlen($value) > 10000), 422, 'Isi survei tidak valid.');
        }
        return DB::transaction(function () use ($request, $id, $access, $journal, $data) {
            // Lock group before applications, matching group decision lock order.
            $groupId = FundingRequestItem::where('active_application_id', $id)->value('funding_request_id');
            $group = $groupId ? FundingRequest::whereKey($groupId)->lockForUpdate()->firstOrFail() : null;
            $groupItems = $group ? $group->items()->whereNotNull('active_application_id')->get() : collect();
            $ids = $groupItems->pluck('application_id')->push($id)->unique()->sort()->values();
            $rows = Application::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $row = $access->find($request, $id);
            abort_unless($row->version === $data['version'], 409, 'Data sudah berubah. Muat ulang sebelum koreksi.');
            abort_unless($data['confirmation'] === $row->number, 422, 'Ketik nomor pengajuan untuk mengonfirmasi koreksi.');
            // Recheck after locks: a group may have been created while waiting for the row.
            abort_unless(FundingRequestItem::where('active_application_id', $id)->value('funding_request_id') === $groupId, 409, 'Pengajuan dana berubah. Muat ulang sebelum koreksi.');
            abort_if($group && !$request->boolean('releaseFundingGroup'), 409, 'Pengajuan ada dalam grup dana aktif. Konfirmasi pembatalan grup sebelum koreksi; seluruh anggota kembali siap diajukan.');
            if (in_array($data['status'], ['approved','fund_ready','fund_submitted','fund_approved','disbursed','completed','delivery_failed','returned'], true)) abort_unless(($data['amount'] ?? 0)>0, 422, 'Tahap ini membutuhkan nominal bantuan.');
            foreach (['verifierId'=>'verifier','distributorId'=>null] as $key=>$role) {
                if (!empty($data[$key])) abort_unless($role ? $access->assigned($data[$key], $role) : ($access->assigned($data[$key], 'verifier') || $access->assigned($data[$key], 'volunteer')), 422, 'Petugas harus aktif dan memiliki peran yang sesuai.');
            }
            $meta = $row->manual_process ?? [];
            foreach (['verifier'=>'manualVerifier', 'distributor'=>'manualDistributor'] as $kind=>$prefix) {
                if (!empty($data[$kind.'Id'])) unset($meta[$kind]);
                elseif (!empty($data[$prefix.'Name'])) $meta[$kind]=array_replace($meta[$kind]??[],['name'=>$data[$prefix.'Name'],'phone'=>$data[$prefix.'Phone']??null,'recordedBy'=>$request->user()->id,'recordedAt'=>now()->toISOString()]);
            }
            if (isset($data['transfer'])) $meta['transferRecipient']=array_replace($meta['transferRecipient']??[], $data['transfer']);
            if (!empty($meta['transferRecipient']) && !empty($data['disbursedAt'])) $meta['transferRecipient']=array_replace($meta['transferRecipient'],['transferDate'=>$data['disbursedAt'],'transferAmount'=>$data['amount']??null]);
            abort_if(($row->applicant['intakeType']??null)==='other' && isset($data['source']) && $data['source']!=='online',422,'Pengajuan lainnya menggunakan sumber Online.');
            if ($data['status']==='survey_assigned') abort_unless(!empty($data['verifierId']) || !empty($meta['verifier']), 422, 'Survei berjalan membutuhkan verifikator.');
            if (in_array($data['status'], ['fund_ready','fund_submitted','fund_approved','disbursed','completed'], true)) abort_unless(!empty($data['distributorId']) || !empty($meta['distributor']) || $row->distribution_type==='direct', 422, 'Tetapkan penyalur untuk tahap dana dan penyerahan.');
            if (in_array($data['status'], ['disbursed','completed','delivery_failed','returned'], true)) abort_unless(!empty($data['disbursedAt']), 422, 'Tanggal transfer wajib untuk tahap ini.');
            if ($data['status']==='completed') abort_unless(!empty($data['completedAt']), 422, 'Tanggal selesai wajib diisi.');
            abort_if(!empty($data['completedAt']) && !empty($data['disbursedAt']) && strtotime($data['completedAt'])<strtotime($data['disbursedAt']), 422, 'Tanggal selesai tidak boleh sebelum transfer.');
            $before = $row->only(['status','amount','verifier_id','distributor_id','distribution_type','disbursed_at','completed_at','survey','handover','manual_process','source','program','region','fund_reference']);
            if ($group) {
                $group->forceFill(['status'=>'rejected','reason'=>'Grup dibatalkan untuk koreksi admin: '.$data['reason'], 'decided_by'=>$request->user()->id,'decided_at'=>now(),'version'=>$group->version+1])->save();
                foreach ($groupItems as $item) {
                    $member = $rows[$item->application_id];
                    $old = $member->status;
                    $member->forceFill(['status'=>'fund_ready','fund_reference'=>null,'version'=>$member->version+1])->save();
                    $item->forceFill(['active_application_id'=>null,'decision_version'=>$member->version])->save();
                    $journal->record($request,$member,'admin_correct',$old,['reason'=>'Grup dana dibatalkan untuk koreksi admin: '.$data['reason'],'fundingRequestId'=>$group->id]);
                    $journal->notify($member,'admin_correct',['fund_requester'],reason:'Grup dana dibatalkan untuk koreksi admin.');
                }
                $row->refresh();
            }
            $changes = ['status'=>$data['status'], 'amount'=>$data['amount']??null,
                'verifier_id'=>$data['verifierId']??null, 'distributor_id'=>$data['distributorId']??null,
                'disbursed_at'=>$data['disbursedAt']??null, 'completed_at'=>$data['completedAt']??null,
                'version'=>$row->version+1, 'manual_process'=>$meta];
            if (array_key_exists('fundReference',$data)) $changes['fund_reference']=$data['fundReference'];
            foreach (['source','program','region'] as $key) if (array_key_exists($key,$data)) $changes[$key]=$data[$key]??'';
            if (!empty($data['distributorId'])) $changes['distribution_type']='verifier';
            elseif (!empty($meta['distributor'])) $changes['distribution_type']='manual';
            if (array_key_exists('survey',$data)) $changes['survey']=array_replace($row->survey??[], $data['survey']??[]);
            if (array_key_exists('handover',$data)) $changes['handover']=array_replace($row->handover??[], $data['handover']??[]);
            $row->forceFill($changes)->save();
            $journal->record($request,$row,'admin_correct',$before['status'],['reason'=>$data['reason'],'previousAmount'=>$before['amount'],'amount'=>$row->amount,'before'=>$before,'after'=>$row->only(array_keys($before))]);
            $journal->notify($row,'admin_correct',['call_center'],array_filter([$row->created_by,$row->verifier_id,$row->distributor_id]),reason:$data['reason']);
            return response()->json(['data'=>['id'=>$row->id,'version'=>$row->version]])->header('Cache-Control','no-store, private');
        }, 3);
    }
}
