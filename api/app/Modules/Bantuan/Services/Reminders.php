<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Support\Facades\DB;

class Reminders
{
    public function send(): int
    {
        $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
        $count = 0;
        foreach (Application::where('status', 'disbursed')->where('disbursed_at', '<', now()->subDays($settings['distributionDays'] ?? 7))->cursor() as $row) {
            app(Journal::class)->notify($row, 'Pengingat: batas waktu penyaluran terlewati', ['approver', 'chair'], [$row->distributor_id], 'overdue:'.now()->toDateString());
            $count++;
        }
        foreach (Application::whereIn('status', ['fund_ready', 'fund_submitted'])->where('updated_at', '<', now()->subDays(3))->cursor() as $row) {
            app(Journal::class)->notify($row, 'Pengingat: penanda dana belum diperbarui', ['fund_requester', 'approver'], [], 'fund-wait:'.now()->toDateString());
            $count++;
        }

        return $count;
    }
}
