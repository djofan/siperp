<?php
namespace App\Modules\Bantuan\Http\Controllers;
use App\Modules\Bantuan\Services\{Access,Journal,Reminders,Whatsapp,ReminderMessage};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class SurveyReminderController
{
    public function __invoke(Request $request,string $id,Access $access)
    {
        $access->allow($request,['call_center']);
        $request->validate(['purpose'=>'sometimes|in:reminder,assignment']);
        return DB::transaction(function()use($request,$id,$access){
            $row=$access->find($request,$id,true);
            $deadline=app(Reminders::class)->surveyDeadline($row);
            $assignment = $request->input('purpose') === 'assignment';
            abort_unless($row->status === 'survey_assigned' && $row->verifier_id,409,'Pengajuan tidak sedang ditugaskan untuk survei.');
            abort_unless($assignment || ($deadline && $deadline['overdue']),409,'Pengingat tersedia setelah batas waktu survei terlewati.');
            $phone=Whatsapp::phone(DB::table('bantuan_staff')->where('user_id',$row->verifier_id)->value('phone'));
            abort_unless($phone,422,'Nomor WhatsApp verifikator belum diisi. Minta admin melengkapi nomor akun.');
            $name=DB::table('users')->where('id',$row->verifier_id)->value('name');
            $intro = $assignment ? 'Anda mendapat tugas survei bantuan. Mohon konfirmasi kesiapan kunjungan.' : 'Mohon tindak lanjuti survei yang sudah melewati batas '.($deadline['days'] ?? 5).' hari.';
            $message = ReminderMessage::greeting($name ?? 'Petugas').$intro."\n\n".ReminderMessage::details($row)."\n\n".ReminderMessage::closing();
            if (!$assignment) app(Journal::class)->notify($row,'Call Center mengingatkan agar survei segera diselesaikan.',[],[$row->verifier_id],'manual-survey-reminder:'.now()->toDateString());
            app(Journal::class)->record($request,$row,$assignment ? 'prepare_survey_assignment_message' : 'prepare_survey_reminder',$row->status,['verifierId'=>$row->verifier_id]);
            return response()->json(['data'=>['url'=>'https://wa.me/'.$phone.'?text='.rawurlencode($message),'message'=>$message]]);
        });
    }
}
