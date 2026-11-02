<?php
// Local, explicitly requested repair of a single application. Dry run by default.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Modules\Bantuan\Models\Application;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
$connection = config('database.default');
if (!app()->environment('local') || !in_array(config("database.connections.$connection.host"), ['127.0.0.1', 'localhost', '::1'], true)) throw new RuntimeException('Local development database only.');
DB::transaction(function () use ($argv) {
    $row = Application::where('number', 'BNT-261101-WMSFGE')->lockForUpdate()->sole();
    echo json_encode(['number' => $row->number, 'status' => $row->status, 'version' => $row->version, 'verifierId' => $row->verifier_id, 'hasSurvey' => !empty($row->survey), 'hasDisbursement' => !!$row->disbursed_at]).PHP_EOL;
    if (!in_array('--execute', $argv, true) || $row->status === 'survey_assignment') return;
    if (!in_array($row->status, ['survey_assigned', 'survey_cc_review', 'survey_submitted', 'review2'], true) || $row->disbursed_at) throw new RuntimeException('Unexpected stage; inspect before changing.');
    $before = ['status' => $row->status, 'version' => $row->version, 'verifierId' => $row->verifier_id];
    $row->status = 'survey_assignment';
    $row->verifier_id = null;
    $row->version++;
    $row->save();
    DB::table('bantuan_events')->insert(['id' => (string) Str::uuid(), 'application_id' => $row->id,
        'actor_id' => 'system:local-maintenance', 'actor_role' => 'system', 'action' => 'restore_survey_assignment',
        'from_status' => $before['status'], 'to_status' => $row->status,
        'details' => Crypt::encryptString(json_encode(['reason' => 'Dikembalikan ke penugasan survei oleh Call Center atas permintaan pengguna melalui pemeliharaan lokal.', 'before' => $before])), 'created_at' => now()]);
    echo json_encode(['number' => $row->number, 'status' => $row->fresh()->status, 'version' => $row->version, 'verifierId' => $row->verifier_id]).PHP_EOL;
});
