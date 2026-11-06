<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::transaction(function () {
            // Pending legacy surveys need CC review; preserve all completed decisions and evidence.
            $ids = DB::table('bantuan_applications')->where('status', 'survey_submitted')
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('bantuan_events')
                    ->whereColumn('bantuan_events.application_id', 'bantuan_applications.id')
                    ->where('action', 'survey_review_submit'))->lockForUpdate()->pluck('id');
            foreach ($ids as $id) {
                DB::table('bantuan_applications')->where('id', $id)->update([
                    'status' => 'survey_cc_review', 'version' => DB::raw('version + 1'), 'updated_at' => now(),
                ]);
                DB::table('bantuan_documents')->where('application_id', $id)->where('kind', 'like', 'survey_%')
                    ->whereNull('deleted_at')->whereNull('used_at')->update(['used_at' => now()]);
            }
        });
    }

    public function down(): void
    {
        // Workflow history and evidence consumption must never be reversed automatically.
    }
};
