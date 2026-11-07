<?php
namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Support\Str;

class ReminderMessage
{
    public static function greeting(string $name): string
    {
        return "Assalamu'alaikum, Bapak/Ibu ".$name.",\n\n";
    }

    public static function closing(): string
    {
        return "Baca selengkapnya di https://erp.lazsip.or.id/admin dan login menggunakan akun Anda.\n\nTerima kasih atas bantuannya.";
    }

    public static function details(Application $row): string
    {
        $message = $row->number." · ".$row->name."\nProgram: ".$row->program
            ."\nTugas: ".(Whatsapp::TASKS[$row->status][1] ?? $row->status);
        $problem = trim(preg_replace('/\s+/u', ' ', (string) ($row->applicant['problem'] ?? '')) ?? '');
        if ($problem !== '') $message .= "\nRingkasan: ".Str::limit($problem, 140);
        if ($row->status === 'survey_assigned') {
            $address = trim((string) ($row->survey_location['address'] ?? ''));
            if ($address === '') $address = implode(', ', array_filter(array_map(
                fn ($key) => trim((string) ($row->applicant[$key] ?? '')), ['street', 'village', 'district', 'city', 'province'])));
            $message .= "\nNo. HP calon penerima: ".(trim((string) ($row->applicant['phone'] ?? '')) ?: 'Belum diisi; hubungi Call Center');
            if ($address !== '') $message .= "\nAlamat survei: ".$address;
            $location = $row->survey_location ?? [];
            $point = isset($location['latitude'], $location['longitude']) ? $location['latitude'].','.$location['longitude'] : $address;
            if ($point !== '') $message .= "\nGoogle Maps: https://www.google.com/maps/search/?api=1&query=".rawurlencode($point);
        }
        return $message;
    }
}
