<?php

namespace Database\Seeders;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Services\Intake;
use App\Modules\Core\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class BantuanUatSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local') || config('database.default') !== 'mysql'
            || config('database.connections.mysql.database') !== 'sipmodular_laravel_dev') {
            throw new RuntimeException('Data UAT hanya boleh dibuat pada database development lokal terisolasi.');
        }
        $password = (string) env('BANTUAN_UAT_PASSWORD');
        if (strlen($password) < 12) {
            throw new RuntimeException('Isi BANTUAN_UAT_PASSWORD minimal 12 karakter tanpa menyimpannya di Git.');
        }
        // Refuse collisions instead of resetting passwords, grants or an existing test workflow.
        $accounts = ['admin' => 'UATADMIN01', 'requester' => 'UATREQ001', 'verifier' => 'UATVER001', 'treasurer' => 'UATTRES01'];
        if (User::whereIn('code', array_values($accounts))->exists()
            || Application::where('number', 'like', 'BNT-UAT-%')->exists()) {
            throw new RuntimeException('Data UAT sudah ada. Gunakan data tersebut; seeder tidak menimpa akun atau pengajuan.');
        }
        DB::transaction(function () use ($accounts, $password) {
            $module = DB::table('modules')->where('slug', 'bantuan')->where('is_active', true)->first();
            if (! $module) {
                throw new RuntimeException('Modul Bantuan aktif diperlukan.');
            }
            $users = [];
            foreach ($accounts as $role => $code) {
                $user = new User;
                $user->forceFill(['code' => $code, 'name' => '[UAT] '.$role, 'email' => strtolower($code).'@uat.sip.invalid',
                    'password_hash' => Hash::make($password), 'is_active' => true, 'is_superadmin' => false])->save();
                DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => $module->id, 'role' => $role]);
                DB::table('bantuan_staff')->insert(['user_id' => $user->id, 'region' => 'Wilayah UAT', 'roles' => json_encode([$role]), 'can_bypass' => false]);
                $users[$role] = $user;
            }
            $states = ['draft', 'survey_assigned', 'fund_approved', 'disbursed', 'completed'];
            $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=');
            foreach ($states as $index => $status) {
                $name = $index === 0 ? "[UAT] O'Neil & Keluarga <uji> ".str_repeat('Nama Panjang ', 8) : '[UAT] Penerima '.($index + 1);
                $nik = '327105990000'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
                $row = new Application;
                $row->forceFill(['id' => (string) Str::uuid(), 'number' => 'BNT-UAT-00'.($index + 1), 'name' => $name,
                    'nik_hash' => app(Intake::class)->nikHash($nik), 'created_by' => $users['requester']->id, 'intake_role' => 'requester',
                    'source' => 'online', 'program' => 'Kesehatan', 'region' => 'Wilayah UAT', 'status' => $status, 'version' => 1,
                    'amount' => $index >= 2 ? 1250000 : null, 'verifier_id' => $users['verifier']->id,
                    'distributor_id' => $index >= 2 ? $users['verifier']->id : null, 'distribution_type' => $index >= 2 ? 'verifier' : null,
                    'disbursed_at' => $index >= 3 ? now()->subDay()->startOfDay() : null,
                    'completed_at' => $status === 'completed' ? now()->startOfDay() : null,
                    'survey' => ['background' => 'Draft survei untuk pengujian lokal', 'needs' => 'Kebutuhan fiktif UAT', 'date' => now()->toDateString()],
                    'handover' => $status === 'completed' ? ['method' => 'tunai', 'date' => now()->toDateString(), 'amount' => 1200000, 'notes' => 'Penyaluran simulasi; tidak ada uang nyata.'] : null,
                    'applicant' => ['name' => $name, 'nik' => $nik, 'birthPlace' => 'Kota UAT', 'birthDate' => '1985-01-01',
                        'gender' => 'perempuan', 'maritalStatus' => 'Menikah', 'street' => 'Alamat fiktif UAT. '.str_repeat('Blok pengujian lokal. ', 12),
                        'rtRw' => '001/002', 'village' => 'Desa UAT', 'district' => 'Kecamatan UAT', 'city' => 'Kota UAT',
                        'housing' => 'Kontrak-sewa', 'rent' => 500000, 'rentPeriod' => 'bulan', 'job' => 'Pekerjaan fiktif', 'income' => 1000000,
                        'incomePeriod' => 'bulan', 'dependentCount' => 0, 'phone' => '080000000000', 'prayer' => 'Ya', 'smoking' => 'Tidak',
                        'previousAid' => false, 'publicationConsent' => false, 'hasSktm' => false, 'willingSktm' => true,
                        'informationSource' => 'UAT lokal', 'problem' => str_repeat('Kebutuhan fiktif untuk pengujian formulir dan laporan. ', 12),
                        'reporterName' => '[UAT] Pelapor terpisah', 'reporterPhone' => '080000000001']])->save();
                foreach (['supporting', ...($index >= 3 ? ['transfer'] : []), ...($status === 'completed' ? ['handover', 'certificate'] : [])] as $kind) {
                    $doc = (string) Str::uuid();
                    $path = 'bantuan/uat/'.$row->id.'/'.$doc.'.enc';
                    Storage::disk('local')->put($path, Crypt::encryptString($png));
                    DB::table('bantuan_documents')->insert(['id' => $doc, 'application_id' => $row->id, 'kind' => $kind, 'path' => $path,
                        'caption' => Crypt::encryptString('Bukti simulasi UAT, bukan dokumen penerima nyata.'), 'mime' => 'image/png',
                        'uploaded_by' => $users['admin']->id, 'created_at' => now()]);
                }
                DB::table('bantuan_events')->insert(['id' => (string) Str::uuid(), 'application_id' => $row->id,
                    'actor_id' => $users['admin']->id, 'actor_role' => 'admin', 'action' => 'uat_fixture', 'from_status' => null,
                    'to_status' => $status, 'details' => Crypt::encryptString(json_encode(['reason' => 'Data simulasi UAT; bukan transaksi operasional.'])), 'created_at' => now()]);
                if ($index === 1) {
                    foreach (['admin', 'verifier'] as $role) {
                        foreach ([1, 2] as $message) {
                            DB::table('bantuan_notifications')->insert(['id' => (string) Str::uuid(), 'application_id' => $row->id,
                                'user_id' => $users[$role]->id, 'message' => '[UAT] Notifikasi lokal '.$message, 'created_at' => now()]);
                        }
                    }
                }
            }
        });
        $this->command?->info('4 akun dan 5 pengajuan [UAT] dibuat di lokal. Data lain tidak diubah.');
    }
}
