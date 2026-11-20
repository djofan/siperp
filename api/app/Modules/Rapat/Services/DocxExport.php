<?php

namespace App\Modules\Rapat\Services;

use Illuminate\Support\Carbon;
use ZipArchive;

class DocxExport
{
    public function response(array $d)
    {
        abort_unless(class_exists(ZipArchive::class), 503, 'Ekstensi ZIP diperlukan untuk ekspor DOCX.');
        $written = fn ($value) => trim((string) $value) !== '' ? (string) $value : 'Belum dicatat';
        $final = ($d['workflowStatus'] ?? 'draft') === 'finalized';
        $finalDate = $d['finalizedAt'] ?? null;
        $lines = [$written($d['institution']['heading']), $written($d['institution']['name']), $written($d['institution']['address']), '',
            RapatData::TEMPLATES[$d['template']], $d['title'], 'Status: '.($final ? 'FINAL' : 'DRAF')];
        if ($finalDate) {
            $lines[] = 'Difinalkan: '.Carbon::parse($finalDate)->setTimezone('Asia/Jakarta')->format('d/m/Y H:i').' WIB';
        }
        $lines = [...$lines, 'Tanggal rapat: '.$d['meetingDate'], 'Waktu: '.$written($d['startTime'] ?? null).' - '.$written($d['endTime'] ?? null),
            'Tempat: '.$written($d['location'] ?? null), 'Agenda: '.$written($d['agenda'] ?? null), 'Pimpinan: '.$written($d['chair'] ?? null),
            'Notulis: '.$written($d['notetaker'] ?? null), '', 'DAFTAR HADIR'];
        $attendance = ['present' => 'Hadir', 'absent' => 'Tidak hadir', 'excused' => 'Izin'];
        foreach ($d['participants'] as $i => $p) {
            $lines[] = ($i + 1).'. '.$p['name'].' - '.$written($p['position'] ?? null).' | '.$attendance[$p['attendance'] ?? 'present'].'    Tanda tangan: __________';
        }
        if (! $d['participants']) {
            $lines[] = 'Belum ada peserta dicatat.';
        }
        $lines = [...$lines, '', 'RINGKASAN', $written($d['minutes']['summary']), '', 'PEMBAHASAN', ...($d['minutes']['discussion'] ?: ['Tidak ada pembahasan dicatat.']),
            '', 'KEPUTUSAN', ...($d['minutes']['decisions'] ?: ['Tidak ada keputusan dicatat.']), '', 'TINDAK LANJUT'];
        foreach ($d['minutes']['actions'] as $a) {
            $lines[] = $a['task'].' | Penanggung jawab: '.$written($a['assignee']).' | Tenggat: '.$written($a['dueDate']).' | '.($a['status'] === 'done' ? 'Selesai' : 'Terbuka');
        }
        if (! $d['minutes']['actions']) {
            $lines[] = 'Tidak ada tindak lanjut dicatat.';
        }
        $lines = [...$lines, '', 'Pimpinan rapat                         Notulis', '', $written($d['chair'] ?? null).'                         '.$written($d['notetaker'] ?? null), 'Tanda tangan: __________               Tanda tangan: __________'];
        $paragraphs = '';
        foreach ($lines as $line) {
            foreach (explode("\n", str_replace("\r", '', (string) $line)) as $part) {
                $part = preg_replace('/[^\x{0009}\x{000A}\x{000D}\x{0020}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $part);
                $paragraphs .= '<w:p><w:r><w:t xml:space="preserve">'.htmlspecialchars($part, ENT_XML1 | ENT_QUOTES, 'UTF-8').'</w:t></w:r></w:p>';
            }
        }
        $tmp = tempnam(sys_get_temp_dir(), 'rapat_docx_');
        abort_if($tmp === false, 503);
        chmod($tmp, 0600);
        try {
            $zip = new ZipArchive;
            abort_unless($zip->open($tmp, ZipArchive::OVERWRITE) === true, 503);
            $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
            $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
            $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'.$paragraphs.'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>');
            $zip->close();
            $bytes = file_get_contents($tmp);
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }

        return response($bytes)->header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')->header('Content-Disposition', 'attachment; filename="notulen-'.$d['id'].'.docx"')->header('Cache-Control', 'no-store, private');
    }
}
