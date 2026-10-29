<?php

namespace App\Modules\Core\Auth;

use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Core owns the login namespace; optional modules only supply their existing codes. */
class AccountCodes
{
    public static function normalize(string $code): string
    {
        return strtoupper(trim($code));
    }

    public static function valid(string $code): bool
    {
        return (bool) preg_match('/^[A-Z0-9][A-Z0-9_-]{2,31}$/D', $code);
    }

    public static function next(string $kind = 'member'): string
    {
        return DB::transaction(function () use ($kind) {
            $key = $kind === 'admin' ? 'core-admin-login' : 'core-login';
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => $key, 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', $key)->lockForUpdate()->first();
            $number = $counter->last_number;
            do {
                $code = ($kind === 'admin' ? 'AMSIP' : 'SIP-').str_pad((string) ++$number, $kind === 'admin' ? 4 : 6, '0', STR_PAD_LEFT);
            } while (DB::table('user_login_codes')->where('code', $code)->exists());
            DB::table('participant_sequences')->where('module_slug', $key)->update(['last_number' => $number]);
            return $code;
        }, 3);
    }

    public static function register(string $userId, string $code): void
    {
        $code = self::normalize($code);
        if (! self::valid($code)) {
            throw ValidationException::withMessages(['code' => 'Kode akun harus terdiri dari 3–32 huruf, angka, tanda hubung, atau garis bawah.']);
        }
        if (str_starts_with($code, 'SASIP') && ($code !== 'SASIP01' || ! User::whereKey($userId)->where('is_superadmin', true)->exists())) {
            throw ValidationException::withMessages(['code' => 'Kode SASIP01 hanya untuk satu akun superadmin.']);
        }
        DB::table('user_login_codes')->insertOrIgnore(['code' => $code, 'user_id' => $userId]);
        if (DB::table('user_login_codes')->where('code', $code)->value('user_id') !== $userId) {
            throw ValidationException::withMessages(['code' => 'Kode akun sudah digunakan akun lain.']);
        }
    }

    public static function find(string $code): ?User
    {
        $code = self::normalize($code);
        if (! self::valid($code)) return null;
        $id = DB::table('user_login_codes')->where('code', $code)->value('user_id');
        return $id ? User::find($id) : null;
    }

    public static function ensureAdmin(User $user): void
    {
        if ($user->is_superadmin || preg_match('/^AMSIP\d{4,}$/D', $user->code)) return;
        $user->code = self::next('admin');
        $user->save();
    }
}
