<?php

namespace App\Modules\Bantuan\Services;

class Attachment
{
    public const RULES = 'required|file|extensions:jpg,jpeg,png,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,txt,csv,rtf|mimes:jpg,jpeg,png,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,txt,csv,rtf|max:10240';

    public static function headers(string $mime, string $id): array
    {
        $types = [
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf',
            'application/msword' => 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.ms-excel' => 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            'application/vnd.ms-powerpoint' => 'ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
            'application/vnd.oasis.opendocument.text' => 'odt', 'application/vnd.oasis.opendocument.spreadsheet' => 'ods',
            'text/plain' => 'txt', 'text/csv' => 'csv', 'application/rtf' => 'rtf', 'text/rtf' => 'rtf',
        ];
        $inline = in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true);
        return ['Content-Type' => $mime, 'Cache-Control' => 'no-store, private',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="dokumen-'.$id.'.'.($types[$mime] ?? 'bin').'"',
            'X-Content-Type-Options' => 'nosniff',
            ...(!$inline ? ['Content-Security-Policy' => "sandbox; default-src 'none'"] : [])];
    }
}
