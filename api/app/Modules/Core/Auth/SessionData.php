<?php

namespace App\Modules\Core\Auth;

use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;

class SessionData
{
    public function forUser(User $user): array
    {
        $access = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->where('module_access.user_id', $user->id)->where('modules.is_active', true)
            ->get(['modules.slug', 'module_access.role']);

        return [
            'userId' => $user->id, 'name' => $user->name,
            'isSuperadmin' => $user->is_superadmin,
            'moduleSlugs' => $access->pluck('slug')->all(),
            'moduleRoles' => $access->pluck('role', 'slug')->all(),
            'panelRedirect' => ! $user->is_superadmin && $access->isNotEmpty() && $access->every(fn ($row) => $row->slug === 'teknisi' && $row->role === 'technician') ? '/teknisi/panel' : null,
        ];
    }
}
