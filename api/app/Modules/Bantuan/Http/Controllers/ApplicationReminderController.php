<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Services\{Access, Journal, Whatsapp, ReminderMessage};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApplicationReminderController
{
    public function recipients(Request $request, string $id, Access $access)
    {
        return $this->handle($request, $id, $access, false);
    }

    public function __invoke(Request $request, string $id, Access $access)
    {
        return $this->handle($request, $id, $access, true);
    }

    public function bulk(Request $request, Access $access)
    {
        $access->allow($request, ['call_center']);
        $input = $request->validate([
            'applications'=>'required|array|min:1|max:100',
            'applications.*.id'=>'required|uuid|distinct',
            'applications.*.status'=>'required|string',
        ]);
        return DB::transaction(function () use ($request, $access, $input) {
            $groups = [];
            foreach (collect($input['applications'])->sortBy('id') as $item) {
                $data = $this->handle($request, $item['id'], $access, true, ['status'=>$item['status']])->getData(true)['data'];
                foreach ($data['recipients'] as $recipient) {
                    $id = $recipient['id'];
                    if (!isset($groups[$id])) $groups[$id] = ['id'=>$id, 'name'=>$recipient['name'], 'url'=>$recipient['url'] ? strtok($recipient['url'], '?') : null, 'items'=>[]];
                    $groups[$id]['items'][] = $data['summary'];
                }
            }
            foreach ($groups as &$group) {
                $group['count'] = count($group['items']);
                $group['message'] = ReminderMessage::greeting($group['name'])."Mohon bantuan Bapak/Ibu untuk menindaklanjuti ".$group['count']." pengajuan berikut sesuai tahap masing-masing:\n\n";
                foreach ($group['items'] as $i=>$summary) $group['message'] .= ($i+1).". ".$summary."\n\n";
                $group['message'] .= ReminderMessage::closing();
                // Long messages remain copyable without relying on browser URL length limits.
                $encoded = rawurlencode($group['message']);
                $group['copyRequired'] = strlen($encoded) > 6000;
                if ($group['url'] && !$group['copyRequired']) $group['url'] .= '?text='.$encoded;
                unset($group['items']);
            }
            return response()->json(['data'=>['count'=>count($input['applications']), 'recipients'=>array_values($groups)]]);
        });
    }

    private function handle(Request $request, string $id, Access $access, bool $send, ?array $validated = null)
    {
        $access->allow($request, ['call_center']);
        $input = $validated ?? $request->validate(['status' => 'required|string', 'recipientIds' => 'sometimes|array|min:1|max:100', 'recipientIds.*' => 'required|string|distinct', 'note' => 'nullable|string|max:1000']);
        return DB::transaction(function () use ($request, $id, $access, $input, $send) {
            $row = $access->find($request, $id, $send);
            abort_unless($row->status === $input['status'], 409, 'Tahap pengajuan sudah berubah. Muat ulang daftar terlebih dahulu.');
            abort_unless(isset(Whatsapp::TASKS[$row->status]), 409, 'Pengajuan ini tidak memiliki tugas yang perlu diingatkan.');
            [$roles, $task] = Whatsapp::TASKS[$row->status];
            $assigned = match ($row->status) {
                'needs_data' => $row->created_by,
                'survey_assigned' => $row->verifier_id,
                'disbursed' => $row->distribution_type === 'direct' ? null : $row->distributor_id,
                default => null,
            };
            if ($row->status === 'disbursed') $roles = $row->distribution_type === 'direct' ? ['treasurer'] : [];
            if (in_array($row->status, ['needs_data', 'survey_assigned'], true)) $roles = [];
            if ($row->status === 'fund_submitted') {
                $owner = DB::table('bantuan_funding_request_items as items')
                    ->join('bantuan_funding_requests as groups', 'groups.id', '=', 'items.funding_request_id')
                    ->where('items.active_application_id', $row->id)->where('groups.status', 'submitted')->value('groups.created_by');
                if ($owner) { $assigned = $owner; $roles = []; }
            }
            $involved = DB::table('bantuan_events')->where('application_id', $row->id)
                ->whereIn('action', ['submit','screen_pass','review1_approve','assign_survey','survey_submit','survey_review_submit','approve','fund_submit','fund_approve','disburse','handover','survey_return','survey_decline'])
                ->pluck('actor_id')->all();
            $fundOwners = DB::table('bantuan_funding_request_items as items')
                ->join('bantuan_funding_requests as groups', 'groups.id', '=', 'items.funding_request_id')
                ->where('items.application_id', $row->id)->pluck('groups.created_by')->all();
            $involved = array_filter([...$involved, ...$fundOwners, $row->created_by, $row->verifier_id, $row->distributor_id]);
            $allMembers = DB::table('module_access')
                ->join('modules', 'modules.id', '=', 'module_access.module_id')
                ->join('users', 'users.id', '=', 'module_access.user_id')
                ->leftJoin('bantuan_staff', 'bantuan_staff.user_id', '=', 'users.id')
                ->where('modules.slug', 'bantuan')->where('modules.is_active', true)->where('users.is_active', true)
                ->where('users.id', '!=', $request->user()->id)
                ->get(['users.id', 'users.name', 'module_access.role', 'bantuan_staff.roles', 'bantuan_staff.phone'])->unique('id')->values();
            $current = $allMembers->filter(function ($member) use ($assigned, $roles, $row) {
                    if ($assigned) return $member->id === $assigned;
                    if ($row->status === 'survey_cc_review' && $member->id === $row->verifier_id) return false;
                    if (in_array($row->status, ['review1', 'survey_submitted', 'review2', 'bypass_review'], true) && in_array($member->id, [$row->created_by, $row->verifier_id], true)) return false;
                    return (bool) array_intersect(Access::expandRoles($member->role, $member->roles), $roles);
                })->unique('id')->values();
            $currentIds = $current->pluck('id')->all();
            $eligible = $allMembers->filter(fn ($m) => in_array($m->id, [...$currentIds, ...$involved], true))->values();
            if (! $send) return response()->json(['data' => ['task' => $task, 'recipients' => $eligible->map(fn ($m) => [
                'id'=>$m->id, 'name'=>$m->name, 'role'=>$m->role, 'current'=>in_array($m->id, $currentIds, true), 'hasWhatsapp'=>(bool) Whatsapp::phone($m->phone),
            ])]]);
            $selected = $input['recipientIds'] ?? $currentIds;
            abort_if(array_diff($selected, $eligible->pluck('id')->all()), 422, 'Penerima tidak terkait pengajuan ini atau sudah tidak aktif.');
            $members = $eligible->whereIn('id', $selected)->values();
            abort_if($members->isEmpty(), 422, 'Belum ada petugas aktif yang dapat menerima pengingat pada tahap ini.');
            // One web reminder per application stage, recipient and day; manual WhatsApp remains available.
            app(Journal::class)->notify($row, 'Call Center meminta koordinasi pengajuan. Tahap saat ini: '.$task, [], $members->pluck('id')->all(), 'manual-task:'.$row->status.':'.now()->toDateString());
            app(Journal::class)->record($request, $row, 'prepare_task_reminder', $row->status, ['recipients' => $members->pluck('id')->all()]);
            $recipients = $members->map(function ($member) use ($row, $task, $input, $currentIds) {
                $message = ReminderMessage::greeting($member->name)."Mohon bantuan Bapak/Ibu untuk menindaklanjuti pengajuan berikut:\n\n".ReminderMessage::details($row)."\n\n".ReminderMessage::closing();
                if (! in_array($member->id, $currentIds, true)) $message .= "\nMohon koordinasi sesuai keterlibatan Anda; tahap ini mungkin sedang ditangani petugas lain.";
                if (! empty($input['note'])) $message .= "\n\nCatatan Call Center: ".$input['note'];
                $phone = Whatsapp::phone($member->phone);
                return ['id' => $member->id, 'name' => $member->name, 'url' => $phone ? 'https://wa.me/'.$phone.'?text='.rawurlencode($message) : null];
            });
            $summary = ReminderMessage::details($row);
            return response()->json(['data' => ['task' => $task, 'summary'=>$summary, 'recipients' => $recipients]]);
        });
    }
}
