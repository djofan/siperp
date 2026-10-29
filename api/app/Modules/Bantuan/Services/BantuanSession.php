<?php

namespace App\Modules\Bantuan\Services;

use App\Contracts\Modules\ModuleSession;
use App\Modules\Core\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BantuanSession implements ModuleSession
{
    private const HOME = ['call_center' => 'screening', 'approver' => 'review', 'chair' => 'review', 'verifier' => 'survei', 'volunteer' => 'santunan', 'fund_requester' => 'dana', 'treasurer' => 'pencairan'];

    public function credentialField(): string
    {
        return 'email';
    }

    public function resolveLogin(string $identifier): array
    {
        return ['userId' => User::where('email', trim($identifier))->value('id'), 'membership' => null];
    }

    public function viewer(Request $request, array $session): array
    {
        return ['id' => $request->user()->id, 'name' => $request->user()->name, 'role' => $session['moduleRoles']['bantuan'] ?? null];
    }

    public function redirect(array $session, ?object $membership): string
    {
        return '/admin/bantuan/'.(self::HOME[$session['moduleRoles']['bantuan'] ?? ''] ?? '');
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

        return isset(self::HOME[$membership?->role ?? '']) ? '/admin/bantuan/'.self::HOME[$membership->role] : null;
    }
}
