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

    public function notify(Application $row, string $action, array $roles, array $users = [], ?string $dedupKey = null): void
    {
        $action = ['submit' => 'Pengajuan dikirim', 'screen_pass' => 'Menunggu review tahap 1',
            'review1_approve' => 'Disetujui untuk survei', 'assign_survey' => 'Anda mendapat tugas survei',
            'survey_submit' => 'Hasil survei menunggu keputusan', 'approve' => 'Nominal bantuan ditetapkan',
            'assign_distributor' => 'Penyalur bantuan ditetapkan', 'fund_submit' => 'Dana sudah diajukan',
            'fund_approve' => 'Dana disetujui, pencairan siap diproses', 'fund_reject' => 'Dana ditolak, perlu tinjauan ulang',
            'disburse' => 'Dana sudah dicairkan, bantuan siap disalurkan', 'handover' => 'Bukti penyerahan lengkap, bantuan selesai',
            'survey_again' => 'Pengajuan memerlukan survei ulang', 'comment' => 'Komentar internal baru',
            'survey_save' => 'Draft survei disimpan', 'delivery_fail' => 'Bantuan gagal disalurkan',
            'return_funds' => 'Dana dikembalikan ke Bendahara', 'reopen' => 'Pengajuan dibuka kembali',
            'cancel' => 'Pengajuan dibatalkan', 'request_data' => 'Data perlu dilengkapi',
        ][$action] ?? $action;
        $ids = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->where('modules.slug', 'bantuan')->whereIn('role', ['admin', ...$roles])->pluck('user_id')->all();
        foreach (array_unique([...$ids, ...array_filter($users)]) as $id) {
            DB::table('bantuan_notifications')->insertOrIgnore(['id' => (string) Str::uuid(), 'application_id' => $row->id,
                'user_id' => $id, 'message' => $row->number.' · '.$action, 'created_at' => now(),
                'dedup_key' => $dedupKey ? hash('sha256', $dedupKey.':'.$row->id.':'.$id) : null]);
        }
    }
}
