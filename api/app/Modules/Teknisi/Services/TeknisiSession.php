<?php

namespace App\Modules\Teknisi\Services;

use App\Contracts\Modules\ModuleSession;
use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeknisiSession implements ModuleSession
{
    public function credentialField(): string { return 'code'; }
    public function resolveLogin(string $identifier): array
    {
        $user = AccountCodes::find($identifier);
        $membership = $user ? DB::table('teknisi_participants')->where('userId', $user->id)->whereNull('deleted_at')->first() : null;
        $role = $user ? DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', 'teknisi')->value('role') : null;
        $manager = $user && ($user->is_superadmin || in_array($role, ['admin', 'manager', 'monitoring'], true));
        $technician = $user && $role === 'technician' && TeknisiTechnician::where('userId', $user->id)->where('isActive', true)->exists();
        return ['userId' => $manager || $technician || ($membership && ! $role) ? $user?->id : null, 'membership' => $membership];
    }
    public function viewer(Request $request, array $session): array
    {
        $user = $request->user(); $role = $user->is_superadmin ? 'admin' : ($session['moduleRoles']['teknisi'] ?? null);
        abort_unless($this->available() && in_array($role, ['admin', 'manager', 'technician', 'monitoring'], true), 403);
        $technician = $role === 'technician' ? TeknisiTechnician::where('userId', $user->id)->first() : null;
        abort_if($role === 'technician' && ! $technician?->isActive, 403);
        return ['id' => $user->id, 'name' => $user->name, 'role' => $role, 'technician' => $technician, 'canManage' => in_array($role, ['admin', 'manager'], true), 'canWrite' => $role !== 'monitoring'];
    }
    public function available(): bool { return DB::table('modules')->where('slug', 'teknisi')->where('is_active', true)->exists(); }
    public function redirect(array $session, ?object $membership): string { return $session['isSuperadmin'] || in_array('teknisi', $session['moduleSlugs'], true) ? '/teknisi/panel' : '/teknisi/peserta'; }
    public function preferredPanel(array $access): ?string
    {
        return $access && collect($access)->every(fn ($row) => $row->slug === 'teknisi' && $row->role === 'technician') ? '/teknisi/panel' : null;
    }
}
