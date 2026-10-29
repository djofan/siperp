<?php

namespace App\Modules\Academy\Services;

use App\Contracts\Modules\ModuleSession;
use App\Modules\Core\Auth\AccountCodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademySession implements ModuleSession
{
    public function credentialField(): string { return 'code'; }
    public function resolveLogin(string $identifier): array
    {
        $user = AccountCodes::find($identifier);
        $membership = $user ? DB::table('zakat_academy_profiles')->where('user_id', $user->id)->whereNull('deleted_at')->first() : null;
        $manager = $user && ($user->is_superadmin || DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', 'academy')->whereIn('role', ['admin', 'editor', 'teacher'])->exists());
        if (! $membership && ! $manager) $user = null;
        return ['userId' => $user?->id, 'membership' => $membership];
    }
    public function viewer(Request $request, array $session): array
    {
        $user = $request->user(); $role = $session['moduleRoles']['academy'] ?? null;
        $profile = $this->available() ? DB::table('zakat_academy_profiles')->where('user_id', $user->id)->first(['id', 'nis', 'must_change_password', 'deleted_at']) : null;
        abort_if($profile?->deleted_at && ! $user->is_superadmin && ! in_array($role, ['admin', 'teacher'], true), 403);
        return ['id' => $user->id, 'name' => $user->name, 'isSuperadmin' => $user->is_superadmin, 'moduleAccess' => $role ? [['role' => $role]] : [], 'isTeacher' => $role === 'teacher', 'academyProfile' => $profile && ! $profile->deleted_at ? ['id' => $profile->id, 'nis' => $profile->nis, 'mustChangePassword' => (bool) $profile->must_change_password, 'deletedAt' => null] : null];
    }
    public function available(): bool { return DB::table('modules')->where('slug', 'academy')->where('is_active', true)->exists() && DB::table('zakat_academy_settings')->where('key', 'maintenance_mode')->value('value') !== 'true'; }
    public function redirect(array $session, ?object $membership): string { return '/academy/lanjut'; }
    public function preferredPanel(array $access): ?string { return null; }
}
