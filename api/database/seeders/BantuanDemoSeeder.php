<?php

namespace Database\Seeders;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Services\Intake;
use App\Modules\Core\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

class BantuanDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('BantuanDemoSeeder hanya boleh dijalankan pada APP_ENV=local.');
        }

        $password = (string) env('BANTUAN_DEMO_PASSWORD');
        if (strlen($password) < 12) {
            throw new RuntimeException('Isi BANTUAN_DEMO_PASSWORD minimal 12 karakter sebelum menjalankan seeder.');
        }

        DB::transaction(function () use ($password): void {
            $module = DB::table('modules')->where('slug', 'bantuan')->first();
            if (! $module) {
                throw new RuntimeException('Modul bantuan belum tersedia. Jalankan migration terlebih dahulu.');
            }

            $users = [];
            foreach ($this->accounts() as $account) {
                $user = User::query()->where('code', $account['code'])->first() ?? new User;
                $user->forceFill([
                    'code' => $account['code'],
                    'name' => $account['name'],
                    'email' => strtolower($account['code']).'@demo.sip.invalid',
                    'password_hash' => Hash::make($password),
                    'is_active' => true,
                    'is_superadmin' => false,
                ])->save();

                DB::table('module_access')->updateOrInsert(
                    ['user_id' => $user->id, 'module_id' => $module->id],
                    ['id' => DB::table('module_access')->where('user_id', $user->id)->where('module_id', $module->id)->value('id') ?? (string) Str::uuid(),
                        'role' => $account['role'], 'created_at' => now()]
                );
                DB::table('bantuan_staff')->updateOrInsert(
                    ['user_id' => $user->id],
                    ['region' => 'Kota Bandung', 'can_bypass' => $account['role'] === 'call_center',
                        'roles' => json_encode([$account['role']], JSON_THROW_ON_ERROR)]
                );
                $users[$account['role']] = $user;
            }

            foreach ($this->applications() as $index => $demo) {
                $row = Application::query()->where('number', $demo['number'])->first() ?? new Application;
                if (! $row->exists) {
                    $row->id = (string) Str::uuid();
                    $row->number = $demo['number'];
                    $row->created_by = $users['requester']->id;
                    $row->version = 1;
                }

                $nik = '32730101010'.str_pad((string) ($index + 1), 5, '0', STR_PAD_LEFT);
                $attributes = [
                    'name' => $demo['name'],
                    'nik_hash' => app(Intake::class)->nikHash($nik),
                    'applicant' => $this->applicant($demo['name'], $nik),
                    'program' => $demo['program'],
                    'region' => 'Kota Bandung',
                    'source' => 'online',
                    'status' => $demo['status'],
                    'intake_role' => 'requester',
                    'verifier_id' => in_array($demo['status'], ['survey_assigned', 'survey_cc_review'], true) ? $users['verifier']->id : null,
                    'distributor_id' => in_array($demo['status'], ['disbursed', 'delivery_failed'], true) ? $users['verifier']->id : null,
                    'distribution_type' => in_array($demo['status'], ['disbursed', 'delivery_failed'], true) ? 'verifier' : null,
                    'amount' => in_array($demo['status'], ['fund_ready', 'fund_submitted', 'fund_approved', 'disbursed', 'delivery_failed'], true) ? 750000 + ($index * 50000) : null,
                    'disbursed_at' => in_array($demo['status'], ['disbursed', 'delivery_failed'], true) ? now()->subDay() : null,
                    'completed_at' => null,
                    'version' => max(1, (int) $row->version),
                ];
                if (Schema::hasTable('bantuan_reporters') && Schema::hasColumn('bantuan_applications', 'reporter_id')) {
                    $reporterId = $row->reporter_id ?: (string) Str::uuid();
                    DB::table('bantuan_reporters')->updateOrInsert(
                        ['id' => $reporterId],
                        ['details' => json_encode(['name' => 'Pelapor Demo', 'phone' => '080000000000'], JSON_THROW_ON_ERROR),
                            'created_at' => now(), 'updated_at' => now()]
                    );
                    $attributes['reporter_id'] = $reporterId;
                }
                $row->forceFill($attributes)->save();
            }
        }, 3);
    }

    private function accounts(): array
    {
        return [
            ['code' => 'BTADMIN01', 'name' => '[Demo] Admin Bantuan', 'role' => 'admin'],
            ['code' => 'BTREQ001', 'name' => '[Demo] Pemohon', 'role' => 'requester'],
            ['code' => 'BTCC0001', 'name' => '[Demo] SIP Call Center', 'role' => 'call_center'],
            ['code' => 'BTVER001', 'name' => '[Demo] Verifikator', 'role' => 'verifier'],
            ['code' => 'BTAPP001', 'name' => '[Demo] Approver', 'role' => 'approver'],
            ['code' => 'BTFUND01', 'name' => '[Demo] Pengaju Dana', 'role' => 'fund_requester'],
            ['code' => 'BTTRES01', 'name' => '[Demo] Bendahara', 'role' => 'treasurer'],
            ['code' => 'BTCHAIR1', 'name' => '[Demo] Ketua', 'role' => 'chair'],
            ['code' => 'BTVOL001', 'name' => '[Demo] Relawan Santunan', 'role' => 'volunteer'],
        ];
    }

    private function applications(): array
    {
        return [
            ['number' => 'BNT-DEMO-001', 'name' => '[Demo] Keluarga Aisyah', 'program' => 'Kebutuhan Pokok', 'status' => 'draft'],
            ['number' => 'BNT-DEMO-002', 'name' => '[Demo] Bapak Rahmat', 'program' => 'Kesehatan', 'status' => 'survey_assignment'],
            ['number' => 'BNT-DEMO-003', 'name' => '[Demo] Ibu Nurhayati', 'program' => 'Kesehatan', 'status' => 'survey_assigned'],
            ['number' => 'BNT-DEMO-004', 'name' => '[Demo] Keluarga Dedi', 'program' => 'Pendidikan', 'status' => 'survey_cc_review'],
            ['number' => 'BNT-DEMO-005', 'name' => '[Demo] Anak Farhan', 'program' => 'Pendidikan', 'status' => 'review1'],
            ['number' => 'BNT-DEMO-006', 'name' => '[Demo] Ibu Siti', 'program' => 'Kebutuhan Pokok', 'status' => 'fund_ready'],
            ['number' => 'BNT-DEMO-007', 'name' => '[Demo] Bapak Hasan', 'program' => 'Kesehatan', 'status' => 'fund_approved'],
            ['number' => 'BNT-DEMO-008', 'name' => '[Demo] Keluarga Salim', 'program' => 'Kebutuhan Pokok', 'status' => 'disbursed'],
        ];
    }

    private function applicant(string $name, string $nik): array
    {
        return [
            'name' => $name, 'nik' => $nik, 'birthPlace' => 'Bandung', 'birthDate' => '1985-01-01',
            'gender' => 'perempuan', 'maritalStatus' => 'Menikah', 'street' => 'Jl. Data Uji No. 1',
            'rtRw' => '001/002', 'village' => 'Sukamaju', 'district' => 'Bandung Wetan', 'city' => 'Kota Bandung',
            'housing' => 'Kontrak-sewa', 'rent' => 500000, 'job' => 'Pekerja harian', 'income' => 1200000,
            'incomePeriod' => 'bulan', 'dependentCount' => 2, 'dependents' => 'Dua anak', 'phone' => '080000000000',
            'prayer' => 'Ya', 'smoking' => 'Tidak', 'previousAid' => false, 'previousAidNotes' => null,
            'publicationConsent' => false, 'hasSktm' => false, 'willingSktm' => true,
            'informationSource' => 'Data demo pengujian', 'problem' => 'Data fiktif untuk menguji alur modul Bantuan.',
        ];
    }
}
