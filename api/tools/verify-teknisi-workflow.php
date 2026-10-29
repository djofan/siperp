<?php

// Real MySQL smoke test: every fixture is rolled back; uploaded fixtures use a private temporary disk.
use App\Modules\Core\Models\User;
use App\Modules\Teknisi\Models\ServiceDetail;
use App\Modules\Teknisi\Models\TeknisiTicket;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
if (! $app->environment('local') || config('database.default') !== 'mysql'
    || config('database.connections.mysql.database') !== 'sipmodular_laravel_dev') {
    throw new RuntimeException('This verifier requires the isolated local MySQL development database.');
}
$suffix = bin2hex(random_bytes(8));
$root = storage_path('framework/testing/teknisi-'.$suffix);
config(['filesystems.disks.local.root' => $root]);
Storage::forgetDisk('local');
$token = '';
$checks = 0;
$request = function (string $method, string $path, array $data = [], array $files = [], int $expected = 200) use ($kernel, &$token, &$checks) {
    Auth::forgetGuards();
    $req = Request::create('/api/v1/teknisi/'.$path, $method, $data, [], $files, [
        'HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.$token,
    ]);
    $response = $kernel->handle($req);
    if ($response->getStatusCode() !== $expected) {
        throw new RuntimeException($path.' expected '.$expected.', received '.$response->getStatusCode().': '.$response->getContent());
    }
    $checks++;

    return json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR);
};
DB::beginTransaction();
try {
    $module = DB::table('modules')->where('slug', 'teknisi')->first();
    if (! $module || ! $module->is_active) {
        throw new RuntimeException('Enable the Teknisi module before verification; no configuration is modified by this script.');
    }
    $user = new User;
    $user->forceFill(['id' => 'verify-user-'.$suffix, 'name' => 'Workflow verifier',
        'email' => $suffix.'@example.test', 'password_hash' => password_hash(bin2hex(random_bytes(24)), PASSWORD_BCRYPT),
        'is_active' => true, 'is_superadmin' => false])->save();
    $outlet = 'verify-outlet-'.$suffix;
    DB::table('module_access')->insert(['id' => 'verify-access-'.$suffix, 'user_id' => $user->id, 'module_id' => $module->id, 'role' => 'technician']);
    DB::table('teknisi_outlets')->insert(['id' => $outlet, 'name' => 'Temporary verification outlet', 'address' => 'Test fixture', 'phone' => '08000000']);
    DB::table('teknisi_technicians')->insert(['id' => 'verify-tech-'.$suffix, 'userId' => $user->id, 'name' => $user->name,
        'outletId' => $outlet, 'specialty' => 'Test', 'isActive' => true, 'active_outlet_id' => $outlet]);
    $token = $user->createToken('workflow-verification')->plainTextToken;
    $photo = fn () => UploadedFile::fake()->image('test.jpg', 8, 8);
    $created = $request('POST', 'tickets', [
        'outletId' => $outlet, 'serviceType' => 'normal', 'priority' => 'normal',
        'customerName' => 'Temporary customer', 'customerPhone' => '0810000000',
        'device' => 'Verification phone', 'complaint' => 'Test repair', 'estimate' => 200000,
    ], ['beforePhoto' => $photo()], 201);
    $id = $created['data']['id'];
    $advance = function (string $operation, array $data = [], array $files = [], int $expected = 200) use ($request, $id) {
        $ticket = TeknisiTicket::findOrFail($id);

        return $request('POST', 'workflow', array_merge(['ticketId' => $id, 'operation' => $operation,
            'expectedStatus' => $ticket->status, 'expectedVersion' => $ticket->updatedAt->toISOString()], $data), $files, $expected);
    };
    $advance('start');
    $advance('complete', ['diagnosis' => 'Port test', 'treatment' => 'Repair test', 'capital' => 50000, 'finalPrice' => 180000, 'warrantyDays' => 30], ['afterPhoto' => $photo()]);
    $advance('collect', ['amount' => 170000, 'paymentMethod' => 'cash', 'receiverName' => 'Test receiver', 'receiverPhone' => '0810000000'], ['handoverPhoto' => $photo()], 422);
    $advance('collect', ['amount' => 180000, 'paymentMethod' => 'transfer', 'receiverName' => 'Test receiver', 'receiverPhone' => '0810000000'], ['handoverPhoto' => $photo(), 'paymentProof' => $photo()]);
    $detail = $request('GET', 'tickets/'.$id)['data']['ticket'];
    $finance = $request('GET', 'service-finance', ['outlet' => $outlet])['data'];
    if ($finance['revenue'] !== 180000 || $finance['profit'] !== 130000) {
        throw new RuntimeException('MySQL finance totals do not match the collected payment and capital.');
    }
    if ($detail['status'] !== 'collected' || count($detail['media']) !== 4 || ! ServiceDetail::where('ticketId', $id)->first()->warrantyUntil->isFuture()) {
        throw new RuntimeException('Finish, documentation, or warranty did not persist correctly.');
    }
    $request('POST', 'tickets', ['outletId' => $outlet, 'serviceType' => 'warranty', 'warrantyParentId' => $id,
        'priority' => 'normal', 'device' => 'ignored', 'complaint' => 'Warranty test', 'estimate' => 0], ['beforePhoto' => $photo()], 201);
    echo json_encode(['database' => 'mysql', 'checks' => $checks, 'workflow' => 'Pending -> Proses -> Ready -> Finish -> Garansi', 'fixtures' => 'rolled back'], JSON_PRETTY_PRINT).PHP_EOL;
} finally {
    DB::rollBack();
    // Only files in this run's unique, explicitly assigned testing disk are removed.
    foreach (Storage::disk('local')->allFiles() as $file) {
        Storage::disk('local')->delete($file);
    }
    if (is_dir($root.'/teknisi-service')) {
        rmdir($root.'/teknisi-service');
    }
    if (is_dir($root)) {
        rmdir($root);
    }
}
