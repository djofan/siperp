<?php
namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Core\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ManualProcesses
{
    public const ROLES = [
        'submit'=>['requester','call_center'], 'screen_pass'=>['call_center'], 'screen_reject'=>['call_center'],
        'request_data'=>['approver','chair','call_center','survey_approver'],
        'review1_approve'=>['approver','chair','survey_approver'], 'review1_reject'=>['approver','chair','survey_approver'],
        'assign_survey'=>['verifier'], 'survey_save'=>['verifier'], 'survey_submit'=>['verifier'],
        'survey_review_save'=>['call_center'], 'survey_review_submit'=>['call_center'], 'survey_return'=>['call_center'],
        'approve'=>['approver','chair'], 'review_reject'=>['approver','chair'], 'survey_again'=>['approver','chair'],
        'assign_distributor'=>['verifier'], 'fund_submit'=>['fund_requester'], 'fund_approve'=>['fund_requester'],
        'fund_reject'=>['fund_requester'], 'disburse'=>['treasurer'], 'handover'=>['verifier','volunteer'],
        'delivery_fail'=>['verifier','volunteer'], 'return_funds'=>['treasurer'],
    ];

    public function record(Request $request, string $id): Application
    {
        $access = app(Access::class);
        $access->allow($request, ['call_center']); // Module admins and Superadmin are included by Access.
        $action = $request->validate(['action'=>['required',Rule::in(array_keys(self::ROLES))]])['action'];
        return app(Workflow::class)->perform($request, $id, $action, $this->context($request, $action));
    }

    public function context(Request $request, string $action): array
    {
        $access = app(Access::class);
        $access->allow($request, ['call_center']);
        abort_unless(isset(self::ROLES[$action]), 422);
        $data = $request->validate([
            'manual'=>'required|array', 'manual.actorId'=>'nullable|string|max:191',
            'manual.name'=>'required_without:manual.actorId|nullable|string|min:2|max:191',
            'manual.phone'=>'nullable|string|max:30', 'manual.channel'=>'required|in:whatsapp,telegram,other',
            'manual.date'=>'required|date_format:Y-m-d|before_or_equal:today',
            'manual.note'=>'required|string|min:5|max:5000',
        ]);
        $actor = $data['manual'];
        $actor['name'] = trim($actor['name'] ?? '');
        if (!empty($actor['actorId'])) {
            abort_unless(collect(self::ROLES[$action])->contains(fn ($role) => $access->assigned($actor['actorId'], $role)), 422, 'Pilih akun pelaksana aktif dengan peran yang sesuai.');
            $actor['name'] = User::findOrFail($actor['actorId'])->name;
        }
        abort_if(mb_strlen($actor['name']) < 2, 422, 'Isi nama pelaksana sebenarnya.');
        $actor['recordedBy'] = $request->user()->id;
        $actor['recordedByName'] = $request->user()->name;
        $actor['recordedAt'] = now()->toIso8601String();
        return $actor;
    }
}
