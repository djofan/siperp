<?php

namespace App\Modules\Bantuan\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Nomor telepon harus berupa teks berisi 8–15 angka.');

            return;
        }
        $digits = preg_replace('/\D/', '', $value);
        $withoutGroups = preg_replace('/\([0-9]+\)/', '', $value);
        if (! preg_match('/^\+?[0-9 ()-]+$/D', $value) || preg_match('/[()]/', $withoutGroups)
            || strlen($digits) < 8 || strlen($digits) > 15
            || (str_starts_with($value, '+') && str_starts_with($digits, '0'))) {
            $fail('Nomor telepon harus berisi 8–15 angka. Gunakan 08…, 021…, atau +62…; spasi, tanda hubung, dan kurung kode area diperbolehkan.');
        }
    }
}
