<?php

use App\Modules\Core\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $module = DB::table('modules')->where('slug', 'academy')->lockForUpdate()->first();
            if (! $module) {
                return;
            }
            $grants = DB::table('module_access')->where('module_id', $module->id)->where('role', 'teacher')->lockForUpdate()->get();
            foreach ($grants as $grant) {
                $user = DB::table('users')->where('id', $grant->user_id)->lockForUpdate()->first();
                DB::table('module_access')->where('id', $grant->id)->delete();
                // Preserve Core identities and all teaching/exam history. Shared accounts stay usable elsewhere.
                $otherAccess = DB::table('module_access')->where('user_id', $grant->user_id)->exists();
                $participant = DB::table('zakat_academy_profiles')->where('user_id', $grant->user_id)->whereNull('deleted_at')->exists();
                if ($user && ! $user->is_superadmin && ! $otherAccess && ! $participant) {
                    DB::table('users')->where('id', $grant->user_id)->update(['is_active' => false]);
                    DB::table('personal_access_tokens')->where('tokenable_id', $grant->user_id)->where('tokenable_type', User::class)->delete();
                }
                DB::table('access_logs')->insert(['id' => (string) Str::uuid(), 'message' => 'Akses Pengajar Academy dihentikan untuk akun '.$grant->user_id.'; identitas dan riwayat dipertahankan.']);
            }
        });
    }

    public function down(): void
    {
        // Retired permissions/accounts must not be re-enabled automatically during a code rollback.
    }
};
