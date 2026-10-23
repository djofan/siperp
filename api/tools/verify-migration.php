<?php

use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt;
use App\Modules\Academy\Models\ZakatAcademyQuizQuestion;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\CoreBankLine;
use App\Modules\Core\Models\CoreContact;
use App\Modules\Core\Models\CoreExpense;
use App\Modules\Core\Models\Module;
use App\Modules\Core\Models\User;
use App\Modules\Core\Services\UserService;
use App\Modules\Payment\Models\PaymentDestinationAccount;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Sarsip\Models\SarsipEntry;
use App\Modules\Sarsip\Models\SarsipPaymentMethod;
use App\Modules\Teknisi\Models\TeknisiPart;
use App\Modules\Teknisi\Models\TeknisiPartUse;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

// Integration smoke test against a fresh, process-local SQLite database only.
foreach (['APP_ENV' => 'testing', 'APP_KEY' => 'base64:'.base64_encode(str_repeat('x', 32)), 'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => ':memory:', 'DB_URL' => '', 'CACHE_STORE' => 'array', 'QUEUE_CONNECTION' => 'sync', 'BCRYPT_ROUNDS' => '4'] as $name => $value) {
    putenv($name.'='.$value);
    $_ENV[$name] = $_SERVER[$name] = $value;
}
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
    throw new RuntimeException('This verifier only permits SQLite :memory:.');
}
Artisan::call('migrate', ['--force' => true]);
config(['payment.gateway' => 'simulation', 'payment.resend.key' => null, 'payment.resend.from' => null]);
Http::preventStrayRequests();
Storage::fake('local');

function check(bool $value, string $message): void
{
    if (! $value) {
        throw new RuntimeException($message);
    }
    echo 'PASS '.$message.PHP_EOL;
}

function sendRequest(string $method, string $path, array $body = [], ?string $token = null, array $extraHeaders = [], array $files = []): array
{
    Auth::forgetGuards();
    $headers = ['HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json'];
    if ($token) {
        $headers['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
    }
    foreach ($extraHeaders as $name => $value) {
        $headers['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;
    }
    if ($files) {
        unset($headers['CONTENT_TYPE']);
    }
    $request = Request::create('http://localhost:8000/api/v1/'.$path, $method, $files ? $body : [], [], $files, $headers, $files ? null : json_encode($body, JSON_THROW_ON_ERROR));
    $http = app(Illuminate\Contracts\Http\Kernel::class);
    $response = $http->handle($request);
    $http->terminate($request, $response);

    return [$response->getStatusCode(), json_decode($response->getContent(), true), $response];
}

$admin = app(UserService::class)->create(['name' => 'Migration Admin', 'email' => 'admin@example.test', 'password' => 'test-password', 'isSuperadmin' => true, 'moduleIds' => []]);
$member = app(UserService::class)->create(['name' => 'Migration Member', 'email' => 'member@example.test', 'password' => 'test-password', 'isSuperadmin' => false, 'moduleIds' => []]);
foreach (['sip', 'sarsip', 'lazsip', 'academy', 'tanwir', 'ojol', 'teknisi'] as $slug) {
    $module = new Module;
    $module->forceFill(['slug' => $slug, 'name' => strtoupper($slug), 'isActive' => true])->save();
}
$adminToken = app(TokenIssuer::class)->issue($admin)->plainTextToken;
$memberToken = app(TokenIssuer::class)->issue($member)->plainTextToken;
[$status, $body] = sendRequest('POST', 'auth/login', ['email' => $admin->email, 'password' => 'test-password']);
check($status === 200 && $body['data']['userId'] === $admin->id, 'Laravel login authenticates Core credentials');
[$status] = sendRequest('POST', 'auth/login', ['email' => $admin->email, 'password' => 'incorrect']);
check($status === 401, 'Invalid password is rejected');
[$status] = sendRequest('GET', 'super/akun', [], $memberToken);
check($status === 403, 'Ordinary users cannot manage Core accounts');
[$status] = sendRequest('POST', 'sip/news', ['title' => 'Test article', 'content' => 'Test content', 'isPinned' => false, 'status' => 'draft'], $memberToken);
check($status === 403, 'Module writes require database-backed authorization');
[$status, $body] = sendRequest('POST', 'sip/news', ['title' => 'Test article', 'content' => 'Test content', 'isPinned' => false, 'status' => 'draft'], $adminToken);
check($status === 201 && isset($body['id']), 'SIP content can be created in Laravel');
[$status] = sendRequest('GET', 'sip/news/'.$body['id']);
check($status === 404, 'Draft content is hidden from the public API');
[$status] = sendRequest('PUT', 'super/akun/'.$admin->id.'/status', ['isActive' => false], $adminToken);
check($status === 422, 'The last active superadmin cannot be disabled');
[$status] = sendRequest('POST', 'payment/checkout', []);
check($status === 422, 'Checkout validates its input and idempotency header');

$bank = new PaymentDestinationAccount;
$bank->forceFill(['moduleSource' => 'sarsip', 'fundType' => 'donasi', 'bankName' => 'TEST', 'accountNumber' => '000', 'accountName' => 'Test only'])->save();
$method = new SarsipPaymentMethod;
$method->forceFill(['method' => 'Test simulation', 'feeAmount' => 100, 'feePercentage' => 0])->save();
$campaign = new SarsipEntry;
$campaign->forceFill(['kind' => 'campaign', 'title' => 'Test campaign', 'description' => 'Test description', 'targetAmount' => 100000, 'status' => 'published'])->save();
$checkout = ['moduleSource' => 'sarsip', 'sourceType' => 'campaign', 'sourceId' => $campaign->id, 'fundType' => 'donasi', 'donorName' => 'Test donor', 'donorPhone' => '081234567890', 'donorEmail' => 'donor@example.test', 'amount' => 10000, 'coversFee' => true, 'isAnonymous' => true, 'paymentMethod' => 'Test simulation'];
[$status, $body] = sendRequest('POST', 'payment/checkout', $checkout, null, ['Idempotency-Key' => 'smoke-checkout-1']);
check($status === 201 && isset($body['transactionId']), 'Laravel creates a validated checkout');
$paymentId = $body['transactionId'];
[$status, $replay] = sendRequest('POST', 'payment/checkout', $checkout, null, ['Idempotency-Key' => 'smoke-checkout-1']);
check($status === 201 && $replay['transactionId'] === $paymentId && PaymentTransaction::count() === 1, 'Idempotent replay creates no duplicate payment');
[$status] = sendRequest('POST', 'payment/checkout', [...$checkout, 'amount' => 20000], null, ['Idempotency-Key' => 'smoke-checkout-1']);
check($status === 409, 'A reused key with different checkout data is rejected');
[$status, $public] = sendRequest('GET', 'payment/status/'.$paymentId);
check($status === 200 && $public['adminFee'] === 100 && ! isset($public['donorId'], $public['donorEmail']), 'Public payment status excludes donor identity');
[$status] = sendRequest('PUT', 'payment/simulate-payment/'.$paymentId, ['status' => 'paid'], $memberToken);
check($status === 403, 'An unrelated account cannot confirm a payment');
[$status] = sendRequest('PUT', 'payment/simulate-payment/'.$paymentId, ['status' => 'paid'], $adminToken);
check($status === 200, 'An authorized admin can confirm a simulation');
[$status] = sendRequest('PUT', 'payment/simulate-payment/'.$paymentId, ['status' => 'failed'], $adminToken);
check($status === 200 && PaymentTransaction::find($paymentId)->status === 'paid', 'Final payment status cannot be overwritten by a repeated confirmation');
[$status, $publicDonors] = sendRequest('GET', 'sarsip/entries/'.$campaign->id.'/donations');
check($status === 200 && $publicDonors['data'][0]['name'] === 'Hamba Allah' && ! isset($publicDonors['data'][0]['email']), 'Public campaign donations preserve anonymity');

config([
    'payment.gateway' => 'ipaymu_sandbox',
    'payment.public_url' => 'http://localhost:3000',
    'payment.api_url' => 'http://localhost:8000/api/v1',
    'payment.ipaymu.api_key' => 'smoke-api-key',
    'payment.ipaymu.va' => '1179000899',
    'payment.ipaymu.base_url' => 'https://sandbox.ipaymu.com/api/v2',
]);
Http::fake(['https://sandbox.ipaymu.com/api/v2/payment' => Http::response(['Status' => 200, 'Data' => ['SessionID' => 'SMOKE-SESSION', 'Url' => 'https://sandbox-payment.ipaymu.com/?sid=SMOKE-SESSION']])]);
$ipaymuCheckout = [...$checkout, 'paymentMethod' => 'iPaymu Sandbox'];
[$status, $ipaymuBody] = sendRequest('POST', 'payment/checkout', $ipaymuCheckout, null, ['Idempotency-Key' => 'smoke-ipaymu-1']);
check($status === 201 && isset($ipaymuBody['transactionId']), 'Laravel creates an iPaymu sandbox checkout');
$ipaymuId = $ipaymuBody['transactionId'];
[$status, $session] = sendRequest('POST', 'payment/gateway-session/'.$ipaymuId);
check($status === 200 && $session['url'] === 'https://sandbox-payment.ipaymu.com/?sid=SMOKE-SESSION', 'Laravel creates a signed iPaymu redirect session');
$ipaymu = PaymentTransaction::findOrFail($ipaymuId);
Http::fake(['https://sandbox.ipaymu.com/api/v2/transaction' => Http::response(['Status' => 200, 'Data' => ['TransactionId' => 4719, 'ReferenceId' => $ipaymu->gatewayReferenceId, 'SessionId' => 'SMOKE-SESSION', 'SubTotal' => $ipaymu->amount + $ipaymu->adminFee, 'Status' => 1, 'PaidStatus' => 'paid']])]);
$callback = ['reference_id' => $ipaymu->gatewayReferenceId, 'sid' => 'SMOKE-SESSION', 'merchant' => '1179000899', 'trx_id' => 4719, 'status_code' => 1, 'transaction_status_code' => 1, 'paid_off' => $ipaymu->amount + $ipaymu->adminFee, 'is_escrow' => false, 'amount' => (string) ($ipaymu->amount + $ipaymu->adminFee), 'additional_info' => []];
$signedCallback = $callback;
ksort($signedCallback, SORT_STRING);
$callbackSignature = hash_hmac('sha256', json_encode($signedCallback, JSON_THROW_ON_ERROR), '1179000899');
[$status] = sendRequest('POST', 'payment/webhook/ipaymu', $callback, null, ['X-Signature' => $callbackSignature]);
check($status === 200 && PaymentTransaction::findOrFail($ipaymuId)->status === 'pending', 'A valid signed iPaymu callback is accepted for asynchronous verification');
\Illuminate\Support\Facades\Artisan::call('queue:work', ['connection' => 'payment', '--queue' => 'callbacks', '--once' => true, '--tries' => 1]);
check(PaymentTransaction::findOrFail($ipaymuId)->status === 'paid', 'The callback worker verifies and finalizes payment once');
[$status] = sendRequest('POST', 'payment/webhook/ipaymu', [...$callback, 'amount' => '1'], null, ['X-Signature' => $callbackSignature]);
check($status === 401 && PaymentTransaction::findOrFail($ipaymuId)->status === 'paid', 'A modified iPaymu callback is rejected without changing payment');

foreach (['tanwir', 'ojol'] as $learning) {
    [$status, $created] = sendRequest('POST', $learning.'/members', ['role' => 'guru', 'name' => $learning.' teacher', 'password' => 'test-password', 'isActive' => true], $adminToken);
    check($status === 201, $learning.' creates teacher accounts in Laravel');
    $teacherId = $created['data']['id'];
    $memberClass = 'App\\Modules\\'.ucfirst($learning).'\\Models\\'.ucfirst($learning).'Member';
    $teacher = $memberClass::findOrFail($teacherId);
    $teacherToken = app(TokenIssuer::class)->issue($teacher->user)->plainTextToken;
    [$status, $groupData] = sendRequest('POST', $learning.'/groups', ['name' => 'Test group', 'picId' => $teacherId], $adminToken);
    check($status === 201, $learning.' creates groups with the correct module policy');
    $groupId = $groupData['data']['id'];
    [$status, $created] = sendRequest('POST', $learning.'/members', ['role' => 'peserta', 'name' => $learning.' participant', 'password' => 'test-password', 'isActive' => true, 'groupId' => $groupId], $adminToken);
    check($status === 201, $learning.' creates participant accounts in Laravel');
    $participant = $memberClass::findOrFail($created['data']['id']);
    $participantToken = app(TokenIssuer::class)->issue($participant->user)->plainTextToken;
    [$status] = sendRequest('GET', $learning.'/members?role=guru&search=', [], $adminToken);
    check($status === 200, $learning.' accepts an empty member search from list pages');
    if ($learning === 'tanwir') {
        [$status] = sendRequest('GET', 'tanwir/students?search=', [], $adminToken);
        check($status === 200, 'Tanwir accepts an empty student search from the admin page');
    }
    [$status, $created] = sendRequest('POST', $learning.'/tasks', ['title' => 'Test quiz', 'description' => 'Test instructions', 'type' => 'quiz', 'deadline' => now()->addDay()->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i'), 'groupIds' => [$groupId], 'questions' => [['question' => 'One question', 'optionA' => 'Correct', 'optionB' => 'Incorrect', 'correctOption' => 'a']]], $teacherToken);
    check($status === 201, $learning.' creates and distributes teacher tasks');
    $taskId = $created['data']['id'];
    [$status, $detail] = sendRequest('GET', $learning.'/student/tasks/'.$taskId, [], $participantToken);
    check($status === 200 && ! isset($detail['data']['questions'][0]['correctOption']), $learning.' withholds quiz answers before submission');
    $questionId = $detail['data']['questions'][0]['id'];
    [$status, $result] = sendRequest('POST', $learning.'/tasks/'.$taskId.'/quiz-attempts', ['answers' => [$questionId => 'a']], $participantToken);
    check($status === 201 && $result['data']['score'] === 100, $learning.' grades a quiz on the backend');
    [$status] = sendRequest('POST', $learning.'/tasks/'.$taskId.'/quiz-attempts', ['answers' => [$questionId => 'b']], $participantToken);
    check($status === 409, $learning.' rejects repeat quiz submissions');
}
[$status, $outlet] = sendRequest('POST', 'teknisi/outlets', ['name' => 'Test outlet', 'address' => 'Test address', 'phone' => '081234567890'], $adminToken);
check($status === 201, 'Teknisi creates an outlet through Laravel');
$outletId = $outlet['data']['id'];
[$status, $account] = sendRequest('POST', 'teknisi/participants', ['name' => 'Test technician', 'address' => 'Test address', 'phone' => '081234567891', 'password' => 'test-password', 'outletId' => $outletId], $adminToken);
check($status === 201 && $account['data']['nip'] === 'PTH01', 'Teknisi assigns an atomic NIP and outlet');
$techUser = User::find($account['data']['userId']);
$techToken = app(TokenIssuer::class)->issue($techUser)->plainTextToken;
[$status] = sendRequest('GET', 'teknisi/viewer', [], $techToken);
check($status === 200, 'Teknisi viewer resolves legacy camelCase account columns');
[$status] = sendRequest('POST', 'teknisi/participants', ['name' => 'Second technician', 'address' => 'Test address', 'phone' => '081234567892', 'password' => 'test-password', 'outletId' => $outletId], $adminToken);
check($status === 409 && User::where('name', 'Second technician')->count() === 0, 'Duplicate outlet assignment rolls the account transaction back');
[$status, $ticket] = sendRequest('POST', 'teknisi/tickets', ['serviceType' => 'normal', 'outletId' => $outletId, 'priority' => 'normal', 'customerName' => 'Private customer', 'customerPhone' => '081200000000', 'device' => 'Test phone', 'complaint' => 'Private issue', 'estimate' => 10000], $techToken, [], ['beforePhoto' => UploadedFile::fake()->image('before.jpg')]);
check($status === 201, 'A technician creates a ticket in the assigned outlet');
$ticket = $ticket['data'];
[$status, $tracking] = sendRequest('GET', 'teknisi/tracking/'.$ticket['trackingToken']);
check($status === 200 && ! isset($tracking['data']['customerName'], $tracking['data']['complaint'], $tracking['data']['events'][0]['note']), 'Public tracking excludes customer identity and staff notes');
$update = ['ticketId' => $ticket['id'], 'operation' => 'start', 'expectedStatus' => 'received', 'expectedVersion' => $ticket['updatedAt']];
[$status] = sendRequest('POST', 'teknisi/workflow', $update, $techToken);
check($status === 200, 'Ticket transitions use millisecond version checks');
[$status] = sendRequest('POST', 'teknisi/workflow', $update, $techToken);
check($status === 409, 'A stale ticket version is rejected');
[$status, $part] = sendRequest('POST', 'teknisi/parts', ['outletId' => $outletId, 'sku' => 'TEST', 'name' => 'Test part', 'stock' => 2, 'minimum' => 1, 'price' => 5000], $techToken);
check($status === 201, 'Teknisi creates stock and its initial movement');
$use = ['ticketId' => $ticket['id'], 'partId' => $part['data']['id'], 'quantity' => 2];
[$status] = sendRequest('POST', 'teknisi/parts/consume', $use, $techToken);
check($status === 200 && TeknisiPart::find($use['partId'])->stock === 0, 'Part usage atomically reduces stock');
[$status] = sendRequest('POST', 'teknisi/parts/consume', $use, $techToken);
check($status === 409 && TeknisiPartUse::count() === 1, 'Insufficient stock rolls back usage and event writes');
[$status, $course] = sendRequest('POST', 'academy/admin/courses', ['title' => 'Test academy', 'slug' => 'test-academy', 'shortDescription' => 'Test course', 'order' => 0, 'isPublished' => 'on'], $adminToken);
check($status === 200, 'Academy saves its curriculum in Laravel');
$courseId = $course['data']['id'];
[$status, $chapter] = sendRequest('POST', 'academy/admin/courses/'.$courseId.'/chapters', ['title' => 'Test chapter', 'slug' => 'test-chapter', 'order' => 0, 'isPublished' => 'on'], $adminToken);
check($status === 200, 'Academy saves scoped chapters');
$chapterId = $chapter['data']['id'];
[$status, $person] = sendRequest('POST', 'academy/participants', ['name' => 'Academy student', 'address' => 'Test address', 'phone' => '081234567894', 'password' => 'test-password', 'gender' => 'IKHWAN', 'courseId' => $courseId], $adminToken);
check($status === 201 && $person['data']['nip'] === 'PAZ001', 'Academy assigns a profile and enrollment atomically');
$student = User::find($person['data']['userId']);
$studentToken = app(TokenIssuer::class)->issue($student)->plainTextToken;
$courseRow = ZakatAcademyCourse::find($courseId);
$courseRow->startsAt = now()->subDay();
$courseRow->save();
$quizInput = ['title' => 'Academy quiz', 'passingScore' => 70, 'timeLimitMinutes' => 10, 'releaseDay' => 1, 'kind' => 'DAILY'];
$quizRoot = 'academy/admin/courses/'.$courseId.'/chapters/'.$chapterId.'/quizzes';
[$status, $quiz] = sendRequest('POST', $quizRoot, $quizInput, $adminToken);
check($status === 200, 'Academy creates draft quizzes before publication');
$quizId = $quiz['data']['id'];
[$status, $question] = sendRequest('POST', $quizRoot.'/'.$quizId.'/questions', ['question' => 'Test question', 'order' => 0, 'type' => 'SINGLE', 'weight' => 1, 'options' => [['id' => '', 'label' => 'Correct', 'isCorrect' => true], ['id' => '', 'label' => 'Incorrect', 'isCorrect' => false]]], $adminToken);
check($status === 200, 'Academy validates and stores quiz options atomically');
$questionRow = ZakatAcademyQuizQuestion::find($question['data']['id']);
$correct = $questionRow->options()->where('is_correct', true)->first();
[$status] = sendRequest('PUT', $quizRoot.'/'.$quizId, $quizInput + ['isPublished' => 'on', 'isActive' => 'on'], $adminToken);
check($status === 200, 'Academy publishes only a quiz with valid answers');
[$status, $attempt] = sendRequest('POST', 'academy/quizzes/'.$quizId.'/attempts', [], $studentToken);
check($status === 201, 'Academy starts a scheduled quiz for an enrolled student');
$attemptId = $attempt['data'];
[$status, $attempt] = sendRequest('GET', 'academy/quizzes/'.$quizId.'/attempts/'.$attemptId, [], $studentToken);
check($status === 200 && ! isset($attempt['data']['answers']['questions'][0]['options'][0]['isCorrect']), 'Academy never exposes answer keys during a live attempt');
[$status] = sendRequest('PUT', 'academy/attempts/'.$attemptId, ['answer' => ['questionId' => $questionRow->id, 'optionId' => $correct->id], 'submit' => true], $studentToken);
check($status === 200 && ZakatAcademyQuizAttempt::find($attemptId)->score === 100.0, 'Academy grades the stored snapshot on the backend');
[$status] = sendRequest('POST', 'academy/quizzes/'.$quizId.'/attempts', [], $studentToken);
check($status === 409, 'Academy prevents a second attempt when retakes are disabled');
[$status] = sendRequest('DELETE', 'academy/admin/courses/'.$courseId, [], $adminToken);
check($status === 409, 'Academy keeps curriculum that has participant history');
foreach (['learning/overview', 'learning/quizzes', 'learning/rankings', 'learning/notes', 'learning/discussions', 'learning/certificates', 'notifications'] as $endpoint) {
    [$status] = sendRequest('GET', 'academy/'.$endpoint, [], $studentToken);
    check($status === 200, 'Academy participant API: '.$endpoint);
}
foreach (['admin/intake', 'admin/cohorts', 'admin/enrollments', 'admin/completions', 'teacher/stats', 'teacher/materials', 'teacher/quizzes', 'teacher/questions', 'teacher/grades', 'teacher/support'] as $endpoint) {
    [$status] = sendRequest('GET', 'academy/'.$endpoint, [], $adminToken);
    check($status === 200, 'Academy management API: '.$endpoint);
}
[$status] = sendRequest('POST', 'super/erp/expenses', ['accountId' => $bank->id, 'reference' => 'TEST-EXPENSE', 'description' => 'Test operating expense', 'amount' => 5000, 'spentAt' => now('Asia/Jakarta')->format('Y-m-d')], $adminToken);
check($status === 200, 'ERP writes expenses and the audit log in one transaction');
[$status] = sendRequest('GET', 'super/erp/finance', [], $adminToken);
check($status === 200, 'ERP finance summary excludes simulation payments');
[$status] = sendRequest('GET', 'super/erp/overview', [], $adminToken);
check($status === 200, 'ERP aggregates all modules through Laravel');
[$status] = sendRequest('POST', 'super/erp/contacts/sync', [], $adminToken);
check($status === 200 && CoreContact::count() > 0, 'ERP synchronizes contacts without modifying source module records');
[$status] = sendRequest('GET', 'super/erp/contacts', [], $memberToken);
check($status === 403, 'ERP contacts remain restricted to superadmins');
$expense = CoreExpense::where('reference', 'TEST-EXPENSE')->first();
$line = new CoreBankLine;
$line->forceFill(['accountId' => $bank->id, 'bookedAt' => now(), 'reference' => 'TEST-BANK', 'description' => 'Test debit', 'direction' => 'keluar', 'amount' => 5000, 'fingerprint' => hash('sha256', 'test')])->save();
[$status] = sendRequest('POST', 'super/erp/bank-lines/match', ['lineId' => $line->id, 'entryId' => $expense->id, 'note' => 'Verified receipt'], $adminToken);
check($status === 200 && $line->fresh()->expenseId === $expense->id, 'ERP matches only an expense with the same account and amount');
[$status] = sendRequest('POST', 'super/erp/bank-lines/match', ['lineId' => $line->id, 'entryId' => $expense->id, 'note' => 'Repeated receipt'], $adminToken);
check($status === 409, 'ERP rejects a duplicate bank reconciliation');
[$status] = sendRequest('POST', 'super/erp/bank-lines/unmatch', ['lineId' => $line->id, 'note' => 'Correcting receipt'], $adminToken);
check($status === 200 && $line->fresh()->expenseId === null, 'ERP can undo reconciliation with an audit reason');
[$status] = sendRequest('POST', 'auth/logout', [], $adminToken);
check($status === 200, 'Logout revokes the current token');
[$status] = sendRequest('GET', 'auth/me', [], $adminToken);
check($status === 401, 'Revoked tokens cannot authenticate again');

echo 'Migration smoke checks completed; no external database was used.'.PHP_EOL;
