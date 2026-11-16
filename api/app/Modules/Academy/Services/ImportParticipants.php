<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ImportParticipants
{
    public function run(array $input): array
    {
        return DB::transaction(function () use ($input) {
            // Share the same sequence lock as manual registration and legacy imports.
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => 'academy', 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', 'academy')->lockForUpdate()->first();
            $cohort = AcademyCohort::whereKey($input['cohortId'])->lockForUpdate()->firstOrFail();
            $number = $counter->last_number;
            $credentials = [];
            $skippedCount = 0;
            // Legacy profiles may predate Core's canonical phone formatting.
            // REPLACE/CHAR work in both production MySQL and the SQLite test DB.
            $storedPhone = 'phone';
            foreach ([' ', '+', '-', '.', '(', ')'] as $separator) {
                $storedPhone = "REPLACE($storedPhone, '$separator', '')";
            }
            foreach ([9, 10, 13] as $character) $storedPhone = "REPLACE($storedPhone, CHAR($character), '')";
            foreach ($input['rows'] as $index => $row) {
                $phone = $row['phone'];
                $existing = ZakatAcademyProfile::with('user')->whereNull('deleted_at')
                    ->whereIn(DB::raw($storedPhone), [$phone, '0'.substr($phone, 2), substr($phone, 2)])
                    ->lockForUpdate()->get();
                if ($existing->isNotEmpty()) {
                    $profile = $existing->first();
                    if ($existing->count() === 1 && $profile->user?->is_active
                        && mb_strtolower(trim($profile->user->name)) === mb_strtolower($row['name'])
                        && trim((string) $profile->address) === $row['address']
                        && $profile->gender === $input['gender']
                        && app(CohortLearning::class)->owns($profile->id, $cohort->id)) {
                        $skippedCount++;
                        continue;
                    }
                    throw ValidationException::withMessages([
                        "rows.$index.phone" => "Nomor HP pada baris {$row['rowNumber']} sudah terdaftar dengan data atau angkatan berbeda. Periksa akun melalui Daftar Peserta; akun lama tidak diubah.",
                    ]);
                }
                do {
                    $code = 'PAZ'.str_pad((string) ++$number, 3, '0', STR_PAD_LEFT);
                } while (DB::table('user_login_codes')->where('code', $code)->exists() || User::where('code', $code)->exists());
                $password = '1234567890';
                $user = new User;
                $user->forceFill(['code' => $code, 'name' => $row['name'], 'email' => strtolower($code).'@peserta.sip.invalid', 'password_hash' => Hash::make($password), 'is_active' => true])->save();
                app(AcademyParticipants::class)->createProfile($user->id, [
                    'cohortId' => $cohort->id, 'gender' => $input['gender'],
                    'name' => $row['name'], 'phone' => $phone, 'address' => $row['address'],
                ], $code);
                ZakatAcademyProfile::where('user_id', $user->id)->update(['must_change_password' => true]);
                $credentials[] = ['name' => $row['name'], 'phone' => $phone, 'code' => $code, 'password' => $password];
            }
            DB::table('participant_sequences')->where('module_slug', 'academy')->update(['last_number' => $number]);

            return ['createdCount' => count($credentials), 'skippedCount' => $skippedCount, 'credentials' => $credentials];
        }, 3);
    }
}
