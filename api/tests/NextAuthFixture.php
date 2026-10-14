<?php

use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

function nextAuthFixture(array $input): array
{
    $process = new Process(['node', '--conditions=react-server', '--import', 'tsx', 'api/tools/next-auth-fixture.mjs'], dirname(base_path()));
    $process->setInput(json_encode($input, JSON_THROW_ON_ERROR));
    $process->setTimeout(60);
    $process->mustRun();

    return json_decode(trim($process->getOutput()), true, flags: JSON_THROW_ON_ERROR);
}

function withNextAuthFixture(Closure $test): void
{
    // No RefreshDatabase/migrate:fresh: this is a clone containing existing Prisma tables.
    $before = DB::table('access_logs')->pluck('id')->all();
    $fixture = nextAuthFixture(['operation' => 'create']);
    try {
        $test($fixture, User::findOrFail($fixture['id']));
    } finally {
        DB::table('personal_access_tokens')->where('tokenable_id', $fixture['id'])->delete();
        DB::table('users')->where('id', $fixture['id'])->delete();
        DB::table('access_logs')->whereNotIn('id', $before)->where('message', 'like', '%Laravel foundation test%')->delete();
    }
}
