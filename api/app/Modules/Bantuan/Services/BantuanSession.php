<?php

namespace App\Modules\Bantuan\Services;

use App\Contracts\Modules\ModuleSession;
use App\Modules\Core\Auth\AccountCodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BantuanSession implements ModuleSession
{
    private const HOME = ['call_center' => '', 'approver' => '', 'chair' => '', 'verifier' => '', 'volunteer' => 'santunan', 'fund_requester' => '', 'treasurer' => ''];

    public function credentialField(): string
    {
        return 'code';
    }

    public function resolveLogin(string $identifier): array
    {
        $user = AccountCodes::find($identifier);
        $allowed = $user && ($user->is_superadmin || DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', 'bantuan')->exists());
        return ['userId' => $allowed ? $user->id : null, 'membership' => null];
    }

    public function viewer(Request $request, array $session): array
    {
        return ['id' => $request->user()->id, 'name' => $request->user()->name, 'role' => $session['moduleRoles']['bantuan'] ?? null];
    }

    public function redirect(array $session, ?object $membership): string
    {
        $home = self::HOME[$session['moduleRoles']['bantuan'] ?? ''] ?? '';
        return '/admin/bantuan'.($home !== '' ? '/'.$home : '');
    }

    public function available(): bool
    {
        return DB::table('modules')->where('slug', 'bantuan')->where('is_active', true)->exists();
    }

    public function preferredPanel(array $access): ?string
    {
        // Other module admins retain the platform hub. Operational accounts bypass Core.
        if (collect($access)->contains(fn ($row) => $row->role === 'admin')) {
            return null;
        }
        $membership = collect($access)->first(fn ($row) => $row->slug === 'bantuan');

        $home = self::HOME[$membership?->role ?? ''] ?? null;
        return $home !== null ? '/admin/bantuan'.($home !== '' ? '/'.$home : '') : null;
    }
}
