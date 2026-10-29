<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Models\PaymentDonor;

class DonorService
{
    public function normalizePhone(string $raw): ?string
    {
        $raw = trim($raw);
        if (! preg_match('/^\+?[\d\s().-]+$/D', $raw)) {
            return null;
        }
        $digits = preg_replace('/\D/', '', $raw);
        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        }

        return preg_match('/^628\d{8,11}$/D', $digits) ? $digits : null;
    }

    public function normalizeEmail(string $raw): ?string
    {
        $raw = strtolower(trim($raw));

        return strlen($raw) <= 191 && preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/D', $raw) ? $raw : null;
    }

    public function resolve(string $name, ?string $phone, ?string $email): PaymentDonor
    {
        $byPhone = $phone ? PaymentDonor::where('phone', $phone)->lockForUpdate()->first() : null;
        $byEmail = $email ? PaymentDonor::where('email', $email)->lockForUpdate()->first() : null;
        if ($byPhone) {
            // A public donation is not an account login. Never merge two existing
            // donor identities merely because a visitor submitted both contacts.
            if ($email && ! $byPhone->email && ! $byEmail) {
                $byPhone->email = $email;
                $byPhone->save();
            }

            return $byPhone;
        }
        if ($byEmail) {
            if ($phone && ! $byEmail->phone && ! $byPhone) {
                $byEmail->phone = $phone;
                $byEmail->save();
            }

            return $byEmail;
        }
        $donor = new PaymentDonor;
        $donor->forceFill(['name' => $name, 'phone' => $phone, 'email' => $email])->save();

        return $donor;
    }
}
