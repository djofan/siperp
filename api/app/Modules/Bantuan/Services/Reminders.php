<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Support\Facades\DB;

class Reminders
{
    public function send(): int
    {
        // Daily reminders for every actionable stage; Journal deduplicates per task/user/day.
        // Skip the two legacy fund reminders and overdue delivery below to avoid duplicates.
        $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
        $count = 0;
        foreach (Application::whereIn('status', array_diff(array_keys(Whatsapp::TASKS), ['fund_ready', 'fund_submitted', 'disbursed']))->cursor() as $row) {
            [$roles, $task] = Whatsapp::TASKS[$row->status];
            $users = match ($row->status) {
                'needs_data' => [$row->created_by],
                'survey_assigned' => [$row->verifier_id],
                default => [],
            };
            if (in_array($row->status, ['needs_data', 'survey_assigned'], true)) $roles = [];
            app(Journal::class)->notify($row, 'Pengingat: '.$task, $roles, $users, 'pending:'.$row->status.':'.now()->toDateString());
            $count++;
        }
        foreach (Application::where('status', 'disbursed')->where(function ($q) use ($settings) {
            $q->whereNull('disbursed_at')->orWhere('disbursed_at', '>=', now()->subDays($settings['distributionDays'] ?? 7));
        })->cursor() as $row) {
            $roles = $row->distribution_type === 'direct' ? ['treasurer'] : [];
            $users = $row->distribution_type === 'verifier' ? [$row->distributor_id] : [];
            app(Journal::class)->notify($row, 'Pengingat: selesaikan penyerahan bantuan', $roles, $users, 'delivery:'.now()->toDateString());
            $count++;
        }
        foreach (Application::where('status', 'disbursed')->where('disbursed_at', '<', now()->subDays($settings['distributionDays'] ?? 7))->cursor() as $row) {
            app(Journal::class)->notify($row, 'Pengingat: batas waktu penyaluran terlewati', ['approver', 'chair', ...($row->distribution_type === 'direct' ? ['treasurer'] : [])], [$row->distributor_id], 'overdue:'.now()->toDateString());
            $count++;
        }
        foreach (Application::whereIn('status', ['fund_ready', 'fund_submitted'])->where('updated_at', '<', now()->subDays(3))->cursor() as $row) {
            app(Journal::class)->notify($row, 'Pengingat: penanda dana belum diperbarui', ['fund_requester', 'approver'], [], 'fund-wait:'.now()->toDateString());
            $count++;
        }
        foreach (Application::whereIn('status', ['fund_ready', 'fund_submitted'])->where('updated_at', '>=', now()->subDays(3))->cursor() as $row) {
            app(Journal::class)->notify($row, 'Pengingat: '.Whatsapp::TASKS[$row->status][1], ['fund_requester'], [], 'fund-wait:'.now()->toDateString());
            $count++;
        }

        return $count;
    }
}
