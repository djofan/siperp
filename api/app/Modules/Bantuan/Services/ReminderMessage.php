<?php
namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;

class ReminderMessage
{
    public static function greeting(string $name): string
    {
        return "Assalamu'alaikum.\nYth. Bapak/Ibu ".$name.",\n\n";
    }

    public static function closing(): string
    {
        return "Mohon ditindaklanjuti. Jika ada kendala, silakan hubungi Call Center. Terima kasih.\nTim SIP/LAZSIP";
    }

    public static function details(Application $row): string
    {
        $base = rtrim((string) (config('bantuan.public_url') ?: config('app.url')), '/');
        return $row->number.' - '.$row->name
            ."\nTugas: ".(Whatsapp::TASKS[$row->status][1] ?? $row->status)
            ."\nLihat selengkapnya: ".$base.'/admin/bantuan/pengajuan/'.rawurlencode($row->id);
    }
}
