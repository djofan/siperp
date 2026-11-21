<?php

namespace App\Modules\Lazsip\Http\Requests;

use App\Modules\Lazsip\Models\Affiliate;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class AffiliateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && Affiliate::where('user_id', $this->user()->id)->where('is_active', true)->exists();
    }

    protected function prepareForValidation(): void
    {
        foreach (['name', 'email', 'phone'] as $key) {
            if (is_string($this->input($key))) {
                $this->merge([$key => trim($this->input($key))]);
            }
        }
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower($this->input('email'))]);
        }
    }

    public function rules(): array
    {
        return ['name' => ['bail', 'required', 'string', 'min:2', 'max:100'],
            'email' => ['bail', 'required', 'string', 'email', 'max:191', function (string $attribute, mixed $value, Closure $fail): void {
                if (DB::table('users')->where('id', '!=', $this->user()->id)->whereRaw('LOWER(email) = ?', [$value])->exists()) {
                    $fail('Email sudah digunakan akun lain.');
                }
            }],
            'phone' => ['bail', 'required', 'string', 'max:30', 'regex:/^\+?[0-9]{8,15}$/D']];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Nomor telepon harus berisi 8–15 angka, boleh diawali +.'];
    }
}
