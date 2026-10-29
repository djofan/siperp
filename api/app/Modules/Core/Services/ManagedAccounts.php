<?php

namespace App\Modules\Core\Services;

use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;

class ManagedAccounts
{
    public function modules(User $actor): array
    {
        return DB::table('modules')->where('is_active', true)
            ->when(! $actor->is_superadmin, fn ($query) => $query->whereIn('id', DB::table('module_access')->where('user_id', $actor->id)->where('role', 'admin')->select('module_id')))
            ->orderBy('name')->get()->map(fn ($module) => [
                'id' => $module->id, 'name' => $module->name, 'slug' => $module->slug,
                'roles' => config('modules.account_management.'.$module->slug.'.roles', []),
                'links' => config('modules.account_management.'.$module->slug.'.links', []),
            ])->all();
    }
}
