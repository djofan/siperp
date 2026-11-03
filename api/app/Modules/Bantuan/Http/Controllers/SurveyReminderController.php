<?php
namespace App\Modules\Bantuan\Http\Controllers;
use App\Modules\Bantuan\Services\{Access,Journal,Reminders,Whatsapp};
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
            $message="Assalamu’alaikum, ".$name.". Mohon tindak lanjut survei pengajuan ".$row->number." atas nama ".$row->name.". Penugasan sudah melewati ".($deadline['days'] ?? 5)." hari. Mohon selesaikan hasil survei atau kabari Call Center jika ada kendala. Terima kasih.";
            if ($assignment) $message = 'Assalamu’alaikum, '.$name.". Anda mendapat tugas survei bantuan SIP/LAZSIP.\n\nNomor pengajuan: ".$row->number."\nPemohon: ".$row->name."\nProgram: ".$row->program."\nAlamat survei: ".($row->survey_location['address'] ?? 'Hubungi Call Center untuk konfirmasi alamat')."\n\nSilakan lakukan kunjungan dan isi hasil survei melalui akun Anda. Hubungi Call Center jika ada kendala penugasan. Terima kasih.";
            if (!$assignment) app(Journal::class)->notify($row,'Call Center mengingatkan agar survei segera diselesaikan.',[],[$row->verifier_id],'manual-survey-reminder:'.now()->toDateString());
            app(Journal::class)->record($request,$row,$assignment ? 'prepare_survey_assignment_message' : 'prepare_survey_reminder',$row->status,['verifierId'=>$row->verifier_id]);
            return response()->json(['data'=>['url'=>'https://wa.me/'.$phone.'?text='.rawurlencode($message),'message'=>$message]]);
        });
    }
}
