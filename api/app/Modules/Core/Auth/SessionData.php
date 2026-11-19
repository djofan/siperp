<?php

namespace App\Modules\Core\Auth;

use App\Modules\Core\Models\User;
use App\Support\ModuleSessions;
use Illuminate\Support\Facades\DB;

class SessionData
{
    public function forUser(User $user): array
    {
        $access = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->where('module_access.user_id', $user->id)->where('modules.is_active', true)
            ->get(['modules.slug', 'module_access.role']);

        $financeOnly = $access->count() === 1 && $access->first()->slug === 'keuangan'
            && in_array($access->first()->role, ['admin', 'finance_admin', 'treasurer', 'operator'], true);

        return [
            'userId' => $user->id, 'name' => $user->name, 'code' => $user->code,
            'isSuperadmin' => $user->is_superadmin,
            'moduleSlugs' => $access->pluck('slug')->all(),
            'moduleRoles' => $access->pluck('role', 'slug')->all(),
            'panelRedirect' => ! $user->is_superadmin ? ($financeOnly ? '/admin/keuangan' : app(ModuleSessions::class)->preferredPanel($access->all())) : null,
        ];
    }
}
