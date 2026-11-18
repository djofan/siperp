<?php

use App\Modules\Core\Services\UserService;
use App\Modules\Keuangan\Services\LegacyFinanceImport;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = app(UserService::class)->create(['name' => 'Import QA', 'password' => 'local-test-password']);
    $time = ['created_at' => '2020-01-01 17:00:00', 'updated_at' => '2020-01-02 17:00:00'];
    $this->snapshot = ['format' => 'keuangan-legacy-v1', 'origin' => 'qa-legacy', 'timezone' => 'Asia/Jakarta', 'dumpSha256' => str_repeat('a', 64), 'tables' => [
        'users' => [['id' => '1', 'name' => 'Legacy QA', 'username' => 'qa', 'email' => 'qa@example.test']],
        'sources' => [['id' => '1', 'name' => 'Source QA', ...$time]],
        'categories' => [['id' => '1', 'name' => 'Category QA', ...$time]],
        'approval_settings' => [['id' => '1', 'from_amount' => '1', 'to_amount' => '9000000000000000', ...$time]],
        'guarantors' => [['id' => '1', 'approval_setting_id' => '1', 'user_id' => '1', ...$time]],
        'expenses' => [
            ['id' => '1', 'source_id' => '1', 'category_id' => '1', 'recipient' => 'QA', 'description' => 'Synthetic only', 'amount' => '9000000000000000', ...$time],
            ['id' => '2', 'source_id' => '1', 'category_id' => '1', 'recipient' => 'QA blank', 'description' => '', 'amount' => '5', ...$time],
        ],
        'approval_statuses' => [['id' => '1', 'name' => 'Waiting'], ['id' => '2', 'name' => 'Approved'], ['id' => '3', 'name' => 'Rejected']],
        'approval' => [['id' => '1', 'expense_id' => '1', 'user_id' => '1', 'approval_status_id' => '2', 'note' => 'Historical note', ...$time]],
    ]];
    $this->mapping = ['1' => $this->user->id];
    $this->import = app(LegacyFinanceImport::class);
});

it('dry runs without writes and reports unresolved accounts using IDs only', function () {
    $report = $this->import->run($this->snapshot, []);
    expect($report['conflicts'])->toBe(['users:1 mapping_required'])
        ->and($report['expenseTotalRupiah'])->toBe('9000000000000005')
        ->and(DB::table('keuangan_expenses')->count())->toBe(0)
        ->and(DB::table('keuangan_import_batches')->count())->toBe(0);
    $this->import->run($this->snapshot, [], true, $report['reviewHash']);
})->throws(RuntimeException::class, 'Impor diblokir');

it('imports atomically and idempotently while preserving dates decisions blanks and native identities', function () {
    $before = (array) DB::table('users')->where('id', $this->user->id)->first();
    $report = $this->import->run($this->snapshot, $this->mapping);
    $result = $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
    expect($result['applied'])->toBeTrue();
    $expense = DB::table('keuangan_expenses')->where('amount', '9000000000000000')->first();
    expect((string) $expense->amount)->toBe('9000000000000000')->and($expense->created_by)->toBeNull()
        ->and($expense->created_at)->toBe('2020-01-01 10:00:00')->and($expense->origin)->toBe('legacy');
    expect(DB::table('keuangan_approvals')->value('decision'))->toBe('approved')
        ->and(DB::table('keuangan_approvals')->value('cancel_reason'))->toBe('legacy_import')
        ->and(DB::table('keuangan_approval_rules')->value('active'))->toBe(0)
        ->and(DB::table('keuangan_approval_events')->value('action'))->toBe('imported_baseline')
        ->and(DB::table('keuangan_approval_events')->value('actor_id'))->toBeNull()
        ->and((array) DB::table('users')->where('id', $this->user->id)->first())->toBe($before)
        ->and(DB::table('module_access')->count())->toBe(0)
        ->and(DB::table('core_expenses')->count())->toBe(0);
    $again = $this->import->run($this->snapshot, $this->mapping);
    expect($again['counts']['added'])->toBe(0)->and($again['counts']['unchanged'])->toBe(6);
    expect($this->import->run($this->snapshot, $this->mapping, true, $again['reviewHash'])['applied'])->toBeFalse()
        ->and(DB::table('keuangan_import_batches')->count())->toBe(1)
        ->and(DB::table('keuangan_approvals')->count())->toBe(1);
});

it('blocks changed source rows and missing source rows rather than overwriting or deleting', function () {
    $report = $this->import->run($this->snapshot, $this->mapping);
    $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
    $this->snapshot['tables']['expenses'][0]['amount'] = '7';
    array_pop($this->snapshot['tables']['expenses']);
    $changed = $this->import->run($this->snapshot, $this->mapping);
    expect($changed['counts']['changed'])->toBe(1)->and($changed['counts']['missing'])->toBe(1);
    $this->import->run($this->snapshot, $this->mapping, true, $changed['reviewHash']);
})->throws(RuntimeException::class, 'Impor diblokir');

it('detects native revisions and refuses stale review tokens', function () {
    $report = $this->import->run($this->snapshot, $this->mapping);
    $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
    DB::table('keuangan_expenses')->update(['version' => 2]);
    $changed = $this->import->run($this->snapshot, $this->mapping);
    expect($changed['conflicts'])->toContain('expenses:1 target_modified');
    $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
})->throws(RuntimeException::class, 'Impor diblokir');

it('rejects invalid amounts IDs references decisions and duplicate assignments before writing', function (string $case) {
    match ($case) {
        'money' => $this->snapshot['tables']['expenses'][0]['amount'] = '12.5',
        'reference' => $this->snapshot['tables']['expenses'][0]['source_id'] = '999',
        'decision' => $this->snapshot['tables']['approval_statuses'][1]['name'] = 'Unknown',
        'duplicate' => $this->snapshot['tables']['approval'][] = [...$this->snapshot['tables']['approval'][0], 'id' => '2'],
        'id' => $this->snapshot['tables']['expenses'][] = $this->snapshot['tables']['expenses'][0],
    };
    try {
        $this->import->run($this->snapshot, $this->mapping, true, str_repeat('x', 64));
    } finally {
        expect(DB::table('keuangan_import_batches')->count())->toBe(0)->and(DB::table('keuangan_expenses')->count())->toBe(0);
    }
})->with(['money', 'reference', 'decision', 'duplicate', 'id'])->throws(RuntimeException::class);

it('refuses nonisolated databases even in local mode', function () {
    $original = config('database.connections.sqlite.database');
    config(['database.connections.sqlite.database' => 'ordinary.sqlite']);
    try {
        $this->import->guard();
    } finally {
        config(['database.connections.sqlite.database' => $original]);
    }
})->throws(RuntimeException::class, 'SQLite lokal terisolasi');

it('refuses production environment even with SQLite configured', function () {
    app()->instance('env', 'production');
    try {
        $this->import->guard();
    } finally {
        app()->instance('env', 'testing');
    }
})->throws(RuntimeException::class, 'SQLite lokal terisolasi');

it('rolls back the entire batch when a late insert fails', function () {
    $report = $this->import->run($this->snapshot, $this->mapping);
    DB::unprepared("CREATE TRIGGER qa_import_failure BEFORE INSERT ON keuangan_approvals BEGIN SELECT RAISE(ABORT, 'synthetic import failure'); END");
    try {
        $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
    } finally {
        expect(DB::table('keuangan_sources')->count())->toBe(0)
            ->and(DB::table('keuangan_expenses')->count())->toBe(0)
            ->and(DB::table('keuangan_legacy_links')->count())->toBe(0)
            ->and(DB::table('keuangan_import_batches')->count())->toBe(0);
    }
})->throws(QueryException::class);

it('requires a fresh review token and never merges duplicate native master names', function () {
    $report = $this->import->run($this->snapshot, $this->mapping);
    DB::table('keuangan_sources')->insert(['id' => 'native-source', 'name' => 'Source QA']);
    $changed = $this->import->run($this->snapshot, $this->mapping);
    expect($changed['conflicts'])->toContain('sources:1 master_name_conflict');
    $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
})->throws(RuntimeException::class, 'Impor diblokir');

it('keeps historical waiting tasks closed and preserves expenses without assignments', function () {
    $this->snapshot['tables']['approval'][0]['approval_status_id'] = '1';
    $report = $this->import->run($this->snapshot, $this->mapping);
    $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
    expect(DB::table('keuangan_approvals')->where('decision', 'waiting')->whereNull('cancelled_at')->count())->toBe(0)
        ->and(DB::table('keuangan_approvals')->count())->toBe(1)
        ->and(DB::table('keuangan_expenses')->count())->toBe(2);
    $this->snapshot['tables']['expenses'][] = [...$this->snapshot['tables']['expenses'][1], 'id' => '3'];
    $next = $this->import->run($this->snapshot, $this->mapping);
    expect($next['counts']['added'])->toBe(1)->and($next['conflicts'])->toBe([]);
    $this->import->run($this->snapshot, $this->mapping, true, $next['reviewHash']);
    expect(DB::table('keuangan_expenses')->count())->toBe(3)->and(DB::table('keuangan_approvals')->count())->toBe(1);
});

it('exposes dry run through the CLI without including private rows', function () {
    $snapshotPath = tempnam(sys_get_temp_dir(), 'finance-snapshot-');
    $mappingPath = tempnam(sys_get_temp_dir(), 'finance-mapping-');
    try {
        file_put_contents($snapshotPath, json_encode($this->snapshot, JSON_THROW_ON_ERROR));
        file_put_contents($mappingPath, json_encode($this->mapping, JSON_THROW_ON_ERROR));
        $this->artisan('keuangan:import-legacy', ['snapshot' => $snapshotPath, 'mapping' => $mappingPath])
            ->expectsOutputToContain('reviewHash')->doesntExpectOutputToContain('Synthetic only')->assertSuccessful();
        expect(DB::table('keuangan_expenses')->count())->toBe(0);
    } finally {
        unlink($snapshotPath);
        unlink($mappingPath);
    }
});

it('preserves distinct source master IDs sharing a label and reports their warning on every dry run', function () {
    $this->snapshot['tables']['sources'][] = [...$this->snapshot['tables']['sources'][0], 'id' => '2'];
    $this->snapshot['tables']['expenses'][1]['source_id'] = '2';
    $report = $this->import->run($this->snapshot, $this->mapping);
    expect($report['warnings'])->toBe(['sources:2 duplicate_source_name_with:1']);
    $this->import->run($this->snapshot, $this->mapping, true, $report['reviewHash']);
    expect(DB::table('keuangan_sources')->count())->toBe(2)
        ->and(DB::table('keuangan_expenses')->distinct()->count('source_id'))->toBe(2);
    $again = $this->import->run($this->snapshot, $this->mapping);
    expect($again['counts']['added'])->toBe(0)->and($again['conflicts'])->toBe([])->and($again['warnings'])->toBe($report['warnings']);
});
