<?php
namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;

class ReminderMessage
{
    public static function greeting(string $name): string
    {
        return "Assalamu'alaikum warahmatullahi wabarakatuh.\nYth. Bapak/Ibu ".$name.",\n\n";
    }

    public static function closing(): string
    {
        return "Mohon berkenan memeriksa rincian melalui akun SIP/LAZSIP dan menindaklanjuti sesuai tugas Bapak/Ibu. Apabila sudah ditangani atau terdapat kendala, mohon informasikan kepada Call Center agar dapat dibantu.\n\nTerima kasih atas waktu, bantuan, dan kerja samanya. Semoga Allah membalas kebaikan Bapak/Ibu.\nWassalamu'alaikum warahmatullahi wabarakatuh.\nTim SIP/LAZSIP";
    }

    public static function details(Application $row): string
    {
        $address = $row->status === 'survey_assigned' ? ($row->survey_location['address'] ?? null) : null;
        $address = $address ?: ($row->applicant['street'] ?? $row->region ?? 'Belum dicatat');
        return "Nomor pengajuan: ".$row->number."\nNama pemohon: ".$row->name."\nProgram bantuan: ".$row->program
            ."\nTugas: ".(Whatsapp::TASKS[$row->status][1] ?? $row->status)
            ."\nAlamat".($row->status === 'survey_assigned' ? ' survei' : '').': '.$address
            ."\nKebutuhan / masalah: ".($row->applicant['problem'] ?? 'Silakan periksa data pengajuan')
            ."\nNominal bantuan: ".($row->amount !== null ? 'Rp '.number_format($row->amount, 0, ',', '.') : 'Belum ditetapkan');
    }
}
