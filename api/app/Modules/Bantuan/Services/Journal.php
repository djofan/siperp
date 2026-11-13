<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Journal
{
    public function record(Request $request, ?Application $row, string $action, ?string $from, array $details = []): void
    {
        DB::table('bantuan_events')->insert(['id' => (string) Str::uuid(), 'application_id' => $row?->id,
            'actor_id' => $request->user()->id, 'actor_role' => app(Access::class)->role($request), 'action' => $action,
            'from_status' => $from, 'to_status' => $row?->status, 'details' => Crypt::encryptString(json_encode($details, JSON_THROW_ON_ERROR)), 'created_at' => now()]);
    }

    public function notify(Application $row, string $action, array $roles, array $users = [], ?string $dedupKey = null, ?string $reason = null): void
    {
        $eventAction = $action;
        $action = ['submit' => 'Pengajuan dikirim', 'screen_pass' => 'Menunggu review tahap 1',
            'review1_approve' => 'Disetujui untuk survei', 'assign_survey' => 'Anda mendapat tugas survei',
            'survey_submit' => 'Hasil survei menunggu review Call Center', 'approve' => 'Nominal bantuan ditetapkan',
            'survey_revise' => 'Verifikator sedang memperbaiki hasil survei',
            'survey_review_withdraw' => 'Hasil survei dikembalikan ke pemeriksaan Call Center',
            'survey_review_save' => 'Draft koreksi survei disimpan',
            'survey_review_submit' => 'Hasil review survei menunggu keputusan',
            'survey_return' => 'Survei dikembalikan ke Verifikator untuk diperbaiki',
            'survey_decline' => 'Tugas survei ditolak, perlu penugasan ulang',
            'survey_location' => 'Titik tujuan survei diperbarui',
            'survey_address' => 'Alamat kunjungan survei diperbarui',
            'assign_distributor' => 'Penyalur bantuan ditetapkan', 'fund_submit' => 'Dana sudah diajukan',
            'fund_approve' => 'Dana disetujui, pencairan siap diproses', 'fund_reject' => 'Dana ditolak, perlu tinjauan ulang',
            'disburse' => 'Dana sudah dicairkan, bantuan siap disalurkan', 'handover' => 'Bukti penyerahan lengkap, bantuan selesai',
            'survey_again' => 'Pengajuan memerlukan survei ulang', 'comment' => 'Komentar internal baru',
            'survey_save' => 'Draft survei disimpan', 'delivery_fail' => 'Bantuan gagal disalurkan',
            'return_funds' => 'Dana dikembalikan ke Bendahara', 'reopen' => 'Pengajuan dibuka kembali',
            'cancel' => 'Pengajuan dibatalkan', 'request_data' => 'Data perlu dilengkapi',
        ][$action] ?? $action;
        if (($row->applicant['intakeType'] ?? null) === 'other') {
            if ($eventAction === 'screen_pass') $action = 'Pengajuan lainnya menunggu penetapan nominal';
            if ($eventAction === 'disburse') $action = 'Dana diterima penyalur, silakan lengkapi laporan penyerahan';
            if ($eventAction === 'other_report') $action = 'Laporan penyaluran tambahan disimpan';
        }
        if ($reason && in_array($eventAction, ['survey_decline', 'survey_return', 'assign_survey'], true)) $action .= ' · '.$reason;
        $ids = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->leftJoin('bantuan_staff', 'bantuan_staff.user_id', '=', 'module_access.user_id')
            ->where('modules.slug', 'bantuan')->get(['module_access.user_id', 'module_access.role', 'bantuan_staff.roles'])
            ->filter(function ($member) use ($row, $roles) {
                $grants = Access::expandRoles($member->role, $member->roles);
                if ($row->status === 'survey_cc_review' && $member->user_id === $row->verifier_id) return false;
                if ($row->status === 'survey_submitted' && in_array($member->user_id, [$row->created_by, $row->verifier_id], true)) return false;
                return (bool) array_intersect($grants, $roles);
            })->pluck('user_id')->all();
        $actorId = request()->user()?->id;
        foreach (array_unique([...$ids, ...array_filter($users)]) as $id) {
            if ($id === $actorId) continue;
            DB::transaction(function () use ($row, $id, $action, $dedupKey, $eventAction) {
                $notificationId = (string) Str::uuid();
                $inserted = DB::table('bantuan_notifications')->insertOrIgnore(['id' => $notificationId, 'application_id' => $row->id,
                    'user_id' => $id, 'message' => $row->number.' · '.$action, 'created_at' => now(),
                    'dedup_key' => $dedupKey ? hash('sha256', $dedupKey.':'.$row->id.':'.$id) : null]);
                if ($inserted && Whatsapp::isTaskEvent($eventAction)) app(Whatsapp::class)->enqueue($notificationId, $id, $row->id, $row->number.' · '.$action);
            });
        }
    }
}
