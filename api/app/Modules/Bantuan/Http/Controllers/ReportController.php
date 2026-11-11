<?php
namespace App\Modules\Bantuan\Http\Controllers;
use App\Modules\Bantuan\Services\{Access,ApplicationQuery,Journal};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class ReportController
{
 public function __invoke(Request $request,Access $access,ApplicationQuery $listing)
 {
  $access->allow($request,['call_center']);
  $filters=$listing->filters($request);
  $rows=$listing->ordered($listing->build($request,$access,$filters),$filters)->get();
  $staff=DB::table('users')->pluck('name','id');
  app(Journal::class)->record($request,null,'export_full_report',null,['count'=>$rows->count(),'filters'=>$filters]);
  return response()->json(['data'=>$rows->map(function($r)use($staff){$a=$r->applicant;$survey=$r->survey??[];$handover=$r->handover??[];
   return ['number'=>$r->number,'name'=>$r->name,'nik'=>$a['nik']??'','phone'=>$a['phone']??'','address'=>$a['street']??'',
    'province'=>$a['province']??'','city'=>$a['city']??'','district'=>$a['district']??'','village'=>$a['village']??'',
    'program'=>$r->program,'source'=>$r->source,'status'=>$r->status,'problem'=>$a['problem']??'','needs'=>$survey['needs']??$a['bypassNeeds']??'',
    'job'=>$a['job']??'','income'=>$a['income']??null,'incomePeriod'=>$a['incomePeriod']??'','dependents'=>$a['dependentCount']??null,
    'amount'=>$r->amount,'paidAmount'=>$handover['amount']??null,'verifier'=>$r->manual_process['verifier']['name']??($staff[$r->verifier_id]??''),
    'distributor'=>$r->manual_process['distributor']['name']??($r->distribution_type==='direct'?'Bendahara langsung':($staff[$r->distributor_id]??'')),
    'createdBy'=>$staff[$r->created_by]??'','createdAt'=>$r->created_at?->toDateString(),'surveyDate'=>$survey['date']??'',
    'disbursedAt'=>$r->disbursed_at?->toDateString(),'completedAt'=>$r->completed_at?->toDateString(),'fundReference'=>$r->fund_reference??'',
    'reporterName'=>$a['reporterName']??'','reporterPhone'=>$a['reporterPhone']??''];
  })])->header('Cache-Control','no-store, private');
 }
}
