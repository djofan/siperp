<?php

use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $module = DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->first();
            if (! $module) return;
            $ids = DB::table('module_access')->where('module_id', $module->id)->where('role', '!=', 'admin')->pluck('user_id');
            foreach (User::whereIn('id', $ids)->where('is_superadmin', false)->orderBy('created_at')->orderBy('id')->lockForUpdate()->get() as $user) {
                if (preg_match('/^SIP[0-9]{3}$/D', $user->code)) continue;
                if (str_starts_with($user->code, 'AMSIP') || DB::table('module_access')->where('user_id', $user->id)->where('module_id', '!=', $module->id)->exists()) continue;
                $user->code = AccountCodes::nextBantuan();
                $user->save();
            }
        });
    }

    public function down(): void
    {
        // Issued login identities must not be silently renumbered on rollback.
    }
};
