<?php

namespace App\Support;

use App\Contracts\Modules\ModuleSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

abstract class CommunitySession implements ModuleSession
{
    protected string $slug;
    public function credentialField(): string { return 'code'; }
    public function resolveLogin(string $identifier): array
    {
        $membership = DB::table($this->slug.'_members')->where('code', strtoupper($identifier))->first();
        return ['userId' => $membership?->user_id, 'membership' => $membership];
    }
    public function viewer(Request $request, array $session): array
    {
        $user = $request->user(); $role = $session['moduleRoles'][$this->slug] ?? null;
        $member = DB::table($this->slug.'_members')->where('user_id', $user->id)->first(['id', 'code', 'role', 'group_id', 'photo']);
        return ['userId' => $user->id, 'name' => $user->name, 'isSuperadmin' => $user->is_superadmin, 'isAdmin' => $user->is_superadmin || $role === 'admin', 'member' => $member ? ['id' => $member->id, 'code' => $member->code, 'role' => $member->role, 'groupId' => $member->group_id, 'photo' => $member->photo] : null];
    }
    public function available(): bool { return DB::table('modules')->where('slug', $this->slug)->where('is_active', true)->exists(); }
    public function redirect(array $session, ?object $membership): string { return '/'.$this->slug.'/'.($membership->role === 'guru' ? 'guru' : 'peserta'); }
    public function preferredPanel(array $access): ?string { return null; }
}
