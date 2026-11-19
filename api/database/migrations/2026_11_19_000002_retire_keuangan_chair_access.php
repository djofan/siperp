<?php

use App\Modules\Core\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $module = DB::table('modules')->where('slug', 'keuangan')->lockForUpdate()->first();
            if (! $module) {
                return;
            }
            foreach (DB::table('module_access')->where('module_id', $module->id)->where('role', 'approver')->lockForUpdate()->get() as $grant) {
                DB::table('module_access')->where('id', $grant->id)->delete();
                $rules = DB::table('keuangan_rule_approvers')->where('user_id', $grant->user_id)->pluck('rule_id');
                DB::table('keuangan_approval_rules')->whereIn('id', $rules)->update(['active' => false]);
                foreach (DB::table('keuangan_approvals')->where('assigned_user_id', $grant->user_id)->where('decision', 'waiting')->whereNull('cancelled_at')->get() as $approval) {
                    DB::table('keuangan_approvals')->where('id', $approval->id)->update(['cancelled_at' => now()->utc(), 'cancel_reason' => 'role_retired', 'version' => $approval->version + 1]);
                    DB::table('keuangan_approval_events')->insert(['id' => (string) Str::uuid(), 'approval_id' => $approval->id, 'actor_id' => null, 'action' => 'closed', 'origin' => 'native', 'changes' => json_encode(['reason' => 'role_retired']), 'reason' => 'Akses Ketua Keuangan dihentikan; riwayat tetap disimpan.', 'recorded_at' => now()->utc()]);
                }
                $shared = DB::table('module_access')->where('user_id', $grant->user_id)->exists();
                foreach (['tanwir_members', 'ojol_members', 'zakat_academy_profiles'] as $table) {
                    if (Schema::hasTable($table) && DB::table($table)->where('user_id', $grant->user_id)->exists()) {
                        $shared = true;
                    }
                }
                $user = DB::table('users')->where('id', $grant->user_id)->first();
                if ($user && ! $user->is_superadmin && ! $shared) {
                    DB::table('users')->where('id', $user->id)->update(['is_active' => false]);
                    DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->where('tokenable_type', User::class)->delete();
                }
                DB::table('access_logs')->insert(['id' => (string) Str::uuid(), 'message' => 'Akses Ketua Keuangan dihentikan untuk akun '.$grant->user_id.'; identitas dan riwayat dipertahankan.']);
            }
        });
    }

    public function down(): void {}
};
