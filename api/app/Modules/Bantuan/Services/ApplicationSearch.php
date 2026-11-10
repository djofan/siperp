<?php
namespace App\Modules\Bantuan\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApplicationSearch
{
    private function normalize(string $text): string
    {
        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', mb_strtolower($text)));
    }

    public function apply(Builder $query, Request $request, Access $access, string $search): void
    {
        $normalized = $this->normalize($search);
        if ($normalized === '') { $query->whereRaw('1 = 0'); return; }
        $terms = array_values(array_unique(explode(' ', $normalized)));
        $names = DB::table('users')->whereIn('id', DB::table('module_access')->join('modules','modules.id','=','module_access.module_id')
            ->where('modules.slug','bantuan')->select('module_access.user_id'))->orWhere('is_superadmin', true)->get(['id','name','code'])->keyBy('id');
        $statusLabels = ['review1'=>'review tahap 1','survey_assignment'=>'menunggu verifikator','survey_assigned'=>'sedang survei',
            'survey_cc_review'=>'review survei call center','survey_submitted'=>'review tahap 2','review2'=>'review ulang nominal',
            'bypass_review'=>'keputusan langsung','fund_ready'=>'perlu diajukan dananya','fund_submitted'=>'dana sedang diajukan',
            'fund_approved'=>'siap dicairkan','disbursed'=>'dana di penyalur','completed'=>'selesai','needs_data'=>'perlu dilengkapi',
            'rejected_t1'=>'ditolak tahap 1','rejected_t2'=>'ditolak tahap 2','cancelled'=>'dibatalkan'];
        $matches = [];
        // Encrypted personal fields cannot be queried using LIKE. Stream only already-authorized,
        // filtered rows and include private values only when this officer may read that row's detail.
        foreach ((clone $query)->select(['id','name','number','status','program','region','source','amount','created_at',
            'created_by','verifier_id','distributor_id','applicant','survey_location','manual_process'])->cursor() as $row) {
            $values = [$row->name,$row->number,$row->program,$row->region,$row->status,$statusLabels[$row->status]??'',
                ['online'=>'online whatsapp','walk_in'=>'walk in datang langsung','bypass'=>'jalur langsung bypass'][$row->source]??$row->source,
                $row->amount === null ? '' : (string)$row->amount,
                $row->amount === null ? '' : number_format($row->amount,0,',','.'), $row->created_at->toDateString(),
                $row->manual_process['verifier']['name']??'', $row->manual_process['distributor']['name']??''];
            foreach ([$row->created_by,$row->verifier_id,$row->distributor_id] as $id) {
                if ($id && isset($names[$id])) { $values[]=$names[$id]->name; $values[]=$names[$id]->code; }
            }
            if ($access->sensitive($request,$row)) {
                $applicant=$row->applicant??[];
                foreach (['street','rtRw','village','district','city','province','phone','job','informationSource','problem',
                    'applicationNotes','customTitle','customLocation','customBeneficiaries','reporterName','reporterPhone'] as $field) $values[]=(string)($applicant[$field]??'');
                $values[]=$row->survey_location['address']??'';
                // NIK remains an exact 16-digit lookup; partial identity searches are not supported.
                if (preg_match('/^[0-9]{16}$/D',$search) && ($applicant['nik']??'')===$search) { $matches[]=$row->id; continue; }
            }
            $haystack=$this->normalize(implode(' ',array_filter($values,fn($value)=>$value!==null)));
            if (collect($terms)->every(fn($term)=>ctype_digit($term) && strlen($term) <= 3
                ? preg_match('/(?<![\p{L}\p{N}])'.preg_quote($term,'/').'(?![\p{L}\p{N}])/u',$haystack) === 1
                : str_contains($haystack,$term))) $matches[]=$row->id;
        }
        $query->whereIn('id',$matches);
    }
}
