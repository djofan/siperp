<?php

namespace App\Modules\Teknisi\Services;

use App\Contracts\Modules\ParticipantModule;
use App\Modules\Core\Models\User;
use App\Modules\Core\Models\ModuleAccess;
use App\Modules\Teknisi\Models\TeknisiOutlet;
use App\Modules\Teknisi\Models\TeknisiParticipant;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use App\Modules\Teknisi\Models\TeknisiTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeknisiParticipants implements ParticipantModule
{
    public function authorize(Request $request): void { app(TeknisiContext::class)->actor($request, true, true); }
    public function publicSetup(Request $request): void { abort(404); }
    public function extraRules(): array { return []; }
    public function codeFormat(): array { return ['PTH', 2]; }
    public function userIdFor(string $profileId): string { return TeknisiParticipant::whereKey($profileId)->whereNull('deleted_at')->lockForUpdate()->firstOrFail()->userId; }
    public function createProfile(string $userId, array $data, string $code): void
    {
        $profile = new TeknisiParticipant;
        $profile->forceFill(['userId' => $userId, 'address' => $data['address'], 'phone' => $data['phone'], 'nip' => $code])->save();
        $this->assign($userId, $data);
    }
    public function updateProfile(string $profileId, string $userId, array $data): void
    {
        TeknisiParticipant::findOrFail($profileId)->forceFill(['address' => $data['address'], 'phone' => $data['phone']])->save();
        $this->assign($userId, $data);
    }
    public function removeProfile(string $profileId, string $userId): void
    {
        TeknisiParticipant::findOrFail($profileId)->forceFill(['deletedAt' => now(), 'phone' => null])->save();
        TeknisiTechnician::where('userId', $userId)->update(['isActive' => false, 'active_outlet_id' => null]);
    }
    public function hasMembership(string $userId): bool { return TeknisiParticipant::where('userId', $userId)->whereNull('deleted_at')->exists(); }
    private function assign(string $userId, array $data): void
    {
        $user = User::findOrFail($userId);
        $outlet = TeknisiOutlet::where('id', $data['outletId'] ?? '')->where('isActive', true)->lockForUpdate()->firstOrFail();
        abort_if(TeknisiTechnician::where('outletId', $outlet->id)->where('isActive', true)->where('userId', '!=', $user->id)->exists(), 409, 'Outlet ini sudah memiliki teknisi aktif.');
        $tech = TeknisiTechnician::where('userId', $user->id)->lockForUpdate()->first() ?? new TeknisiTechnician;
        abort_if($tech->exists && $tech->outletId !== $outlet->id && TeknisiTicket::where('technicianId', $tech->id)->whereNotIn('status', TeknisiContext::CLOSED)->exists(), 409, 'Selesaikan tiket aktif sebelum memindahkan teknisi.');
        $tech->forceFill(['userId' => $user->id, 'name' => $user->name, 'outletId' => $outlet->id, 'activeOutletId' => $outlet->id, 'specialty' => ($data['specialty'] ?? null) ?: ($tech->specialty ?: 'Servis HP'), 'isActive' => true])->save();
        $moduleId = DB::table('modules')->where('slug', 'teknisi')->value('id');
        $access = ModuleAccess::where('user_id', $user->id)->where('module_id', $moduleId)->first() ?? new ModuleAccess;
        $access->forceFill(['userId' => $user->id, 'moduleId' => $moduleId, 'role' => 'technician'])->save();
    }
}
