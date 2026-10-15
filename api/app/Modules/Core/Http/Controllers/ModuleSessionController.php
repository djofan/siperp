<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ModuleSessionController
{
    public function login(Request $request, string $module, TokenIssuer $issuer, SessionData $sessions): JsonResponse
    {
        abort_unless(in_array($module, ['tanwir', 'ojol', 'academy', 'teknisi'], true), 404);
        $identifier = in_array($module, ['tanwir', 'ojol'], true) ? 'code' : 'nip';
        $input = $request->validate([$identifier => 'required|string|max:191', 'password' => 'required|string|max:72']);
        $code = strtoupper(preg_replace('/\s+/', '', trim($input[$identifier])));
        $membership = null;
        if (in_array($module, ['tanwir', 'ojol'], true)) {
            $membership = DB::table($module.'_members')->where('code', $code)->first();
            $user = $membership ? User::find($membership->user_id) : null;
        } elseif ($module === 'teknisi') {
            $membership = DB::table('teknisi_participants')->where('nip', $code)->whereNull('deleted_at')->first();
            $user = $membership ? User::find($membership->userId) : null;
        } else {
            $membership = DB::table('zakat_academy_profiles')->where('nis', $code)->whereNull('deleted_at')->first();
            $user = $membership ? User::find($membership->user_id) : User::where('email', strtolower(trim($input[$identifier])))->first();
            if ($user && ! $membership && ! $user->is_superadmin) {
                $profile = DB::table('zakat_academy_profiles')->where('user_id', $user->id)->whereNull('deleted_at')->exists();
                $teacher = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', 'academy')->where('role', 'teacher')->exists();
                if (! $profile && ! $teacher) {
                    $user = null;
                }
            }
        }
        abort_unless($user && Hash::check($input['password'], $user->password_hash), 401, 'Kode akun atau password salah.');
        abort_unless($user->is_active, 403, 'Akun ini nonaktif. Hubungi admin.');
        $registered = DB::table('modules')->where('slug', $module)->first();
        abort_unless($registered && ($registered->is_active || $user->is_superadmin), 403, 'Program belum dibuka. Hubungi admin.');
        $session = $sessions->forUser($user);
        $next = match ($module) {
            'tanwir', 'ojol' => '/'.$module.'/'.($membership->role === 'guru' ? 'guru' : 'peserta'),
            'academy' => '/academy/lanjut',
            default => in_array('teknisi', $session['moduleSlugs'], true) ? '/teknisi/panel' : '/teknisi/peserta',
        };
        $token = $issuer->issue($user);

        return response()->json(['ok' => true, 'redirectTo' => $next, 'nextPath' => $next, 'data' => $session])
            ->withCookie(cookie('sip_session', $token->plainTextToken, 10080, '/', null, config('frontend.secure_cookie'), true, false, 'lax'));
    }

    public function viewer(Request $request, string $module, SessionData $sessions): JsonResponse
    {
        abort_unless(in_array($module, ['tanwir', 'ojol', 'academy', 'teknisi'], true), 404);
        $user = $request->user();
        $session = $sessions->forUser($user);
        $role = $session['moduleRoles'][$module] ?? null;
        if (in_array($module, ['tanwir', 'ojol'], true)) {
            $member = DB::table($module.'_members')->where('user_id', $user->id)->first(['id', 'code', 'role', 'group_id', 'photo']);
            $data = ['userId' => $user->id, 'name' => $user->name, 'isSuperadmin' => $user->is_superadmin, 'isAdmin' => $user->is_superadmin || $role === 'admin',
                'member' => $member ? ['id' => $member->id, 'code' => $member->code, 'role' => $member->role, 'groupId' => $member->group_id, 'photo' => $member->photo] : null];
        } elseif ($module === 'academy') {
            $profile = $this->academyAvailable() ? DB::table('zakat_academy_profiles')->where('user_id', $user->id)->first(['id', 'nis', 'must_change_password', 'deleted_at']) : null;
            abort_if($profile?->deleted_at && ! $user->is_superadmin && ! in_array($role, ['admin', 'teacher'], true), 403);
            $data = ['id' => $user->id, 'name' => $user->name, 'isSuperadmin' => $user->is_superadmin,
                'moduleAccess' => $role ? [['role' => $role]] : [], 'isTeacher' => $role === 'teacher',
                'academyProfile' => $profile && ! $profile->deleted_at ? ['id' => $profile->id, 'nis' => $profile->nis, 'mustChangePassword' => (bool) $profile->must_change_password, 'deletedAt' => null] : null];
        } else {
            abort_unless(DB::table('modules')->where('slug', 'teknisi')->where('is_active', true)->exists(), 403);
            $role = $user->is_superadmin ? 'admin' : $role;
            abort_unless(in_array($role, ['admin', 'manager', 'technician', 'monitoring'], true), 403);
            $technician = $role === 'technician' ? TeknisiTechnician::where('userId', $user->id)->first() : null;
            abort_if($role === 'technician' && ! $technician?->isActive, 403);
            $data = ['id' => $user->id, 'name' => $user->name, 'role' => $role, 'technician' => $technician, 'canManage' => in_array($role, ['admin', 'manager'], true), 'canWrite' => $role !== 'monitoring'];
        }

        return response()->json(['data' => $data]);
    }

    public function availability(): JsonResponse
    {
        return response()->json(['data' => $this->academyAvailable()]);
    }

    private function academyAvailable(): bool
    {
        return DB::table('modules')->where('slug', 'academy')->where('is_active', true)->exists()
            && DB::table('zakat_academy_settings')->where('key', 'maintenance_mode')->value('value') !== 'true';
    }
}
