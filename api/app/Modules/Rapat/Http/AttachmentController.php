<?php

namespace App\Modules\Rapat\Http;

use App\Modules\Rapat\Models\Attachment;
use App\Modules\Rapat\Services\AttachmentAccess;
use App\Modules\Rapat\Services\RapatHistory;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\HeaderUtils;
use ZipArchive;

class AttachmentController
{
    public function __construct(private AttachmentAccess $access) {}

    private function resource(Attachment $attachment): array
    {
        return ['id' => $attachment->id, 'name' => $attachment->name, 'mime' => $attachment->mime,
            'size' => $attachment->size, 'createdAt' => $attachment->created_at->toISOString()];
    }

    public function index(Request $request, string $id)
    {
        $this->access->meeting($request, $id);

        return response()->json(['data' => Attachment::where('meeting_id', $id)
            ->orderBy('created_at')->orderBy('id')->get()->map(fn ($a) => $this->resource($a))->all()])
            ->header('Cache-Control', 'no-store, private')->header('X-Content-Type-Options', 'nosniff');
    }

    public function store(Request $request, string $id)
    {
        $this->access->writable($request);
        $this->access->meeting($request, $id);
        $request->validate(['version' => 'required|integer|min:1', 'file' => 'required|file|max:10240']);
        $file = $request->file('file');
        $mime = $this->validateFile($file);
        abort_unless(mb_check_encoding($file->getClientOriginalName(), 'UTF-8'), 422, 'Nama berkas tidak valid.');
        $name = mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/u', '', basename(str_replace('\\', '/', $file->getClientOriginalName())))), 0, 191);
        abort_if($name === '', 422, 'Nama berkas wajib tersedia.');
        $path = null;
        try {
            return DB::transaction(function () use ($request, $id, $file, $mime, $name, &$path) {
                $meeting = $this->access->meeting($request, $id, true);
                $this->access->editable($request, $meeting);
                $before = RapatHistory::snapshot($meeting);
                abort_if(Attachment::where('meeting_id', $id)->count() >= 50, 409, 'Maksimal 50 lampiran aktif per rapat.');
                $attachmentId = (string) Str::uuid();
                $path = 'rapat/attachments/'.$attachmentId.'.enc';
                $bytes = file_get_contents($file->getRealPath());
                abort_if($bytes === false, 503, 'Berkas tidak dapat dibaca.');
                abort_unless(Storage::disk('local')->put($path, Crypt::encryptString($bytes), ['visibility' => 'private']), 503, 'Penyimpanan privat tidak tersedia.');
                $attachment = Attachment::create(['id' => $attachmentId, 'meeting_id' => $id,
                    'name' => $name, 'mime' => $mime, 'size' => strlen($bytes), 'path' => $path]);
                $meeting->version++;
                $meeting->save();
                RapatHistory::record($meeting, $request, 'attachment_added', $before, ['attachments'], $name);

                return response()->json(['data' => $this->resource($attachment)], 201)
                    ->header('Location', '/api/v1/rapat/attachments/'.$attachmentId)
                    ->header('Cache-Control', 'no-store, private')->header('X-Content-Type-Options', 'nosniff');
            });
        } catch (\Throwable $exception) {
            // Also covers transaction commit failure, after the closure has returned.
            if ($path !== null) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
    }

    public function show(Request $request, string $id)
    {
        $attachment = Attachment::findOrFail($id);
        $this->access->meeting($request, $attachment->meeting_id);
        $bytes = Crypt::decryptString(Storage::disk('local')->get($attachment->path));
        $extension = strtolower(pathinfo($attachment->name, PATHINFO_EXTENSION));
        $fallback = preg_match('/^[a-z0-9]{1,10}$/D', $extension) ? 'document.'.$extension : 'document';

        return response($bytes)->header('Content-Type', $attachment->mime)
            ->header('Content-Disposition', HeaderUtils::makeDisposition('attachment', $attachment->name, $fallback))
            ->header('Cache-Control', 'no-store, private')->header('X-Content-Type-Options', 'nosniff');
    }

    public function destroy(Request $request, string $id)
    {
        $this->access->writable($request);
        $attachment = Attachment::findOrFail($id);

        return DB::transaction(function () use ($request, $attachment) {
            $meeting = $this->access->meeting($request, $attachment->meeting_id, true);
            $this->access->editable($request, $meeting);
            $before = RapatHistory::snapshot($meeting);
            // Re-read under the same parent lock so concurrent deletes cannot bump twice.
            Attachment::findOrFail($attachment->id)->delete();
            $meeting->version++;
            $meeting->save();
            RapatHistory::record($meeting, $request, 'attachment_removed', $before, ['attachments'], $attachment->name);

            return response()->noContent()->header('Cache-Control', 'no-store, private')->header('X-Content-Type-Options', 'nosniff');
        });
    }

    private function validateFile(UploadedFile $file): string
    {
        abort_if($file->getSize() < 1 || $file->getSize() > 10 * 1024 * 1024, 422, 'Ukuran berkas maksimal 10 MiB dan tidak boleh kosong.');
        $extension = strtolower($file->getClientOriginalExtension());
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());
        $types = ['pdf' => ['application/pdf'], 'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'],
            'png' => ['image/png'], 'webp' => ['image/webp'], 'txt' => ['text/plain'],
            'csv' => ['text/plain', 'text/csv', 'application/csv']];
        $office = ['docx' => ['word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xlsx' => ['xl/workbook.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'pptx' => ['ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']];
        if (isset($office[$extension])) {
            abort_unless(in_array($mime, ['application/zip', 'application/x-zip-compressed', $office[$extension][1]], true), 422, 'Isi dokumen Office tidak sesuai.');
            $this->validateOffice($file, $office[$extension][0], $office[$extension][1]);

            return $office[$extension][1];
        }
        abort_unless(isset($types[$extension]) && in_array($mime, $types[$extension], true), 422, 'Format berkas tidak didukung atau tidak sesuai isinya.');
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            $image = @getimagesize($file->getRealPath());
            abort_unless($image && $image['mime'] === $mime, 422, 'Isi gambar tidak valid.');
        }
        if (in_array($extension, ['txt', 'csv'], true)) {
            $bytes = file_get_contents($file->getRealPath());
            abort_if(preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]|<\?(?:php|=)|<\s*(?:!doctype\s+html|html|script|svg)\b/i', $bytes), 422, 'Isi teks tidak didukung.');
        }

        return $mime;
    }

    private function validateOffice(UploadedFile $file, string $main, string $mime): void
    {
        abort_unless(class_exists(ZipArchive::class), 503, 'Validasi dokumen Office tidak tersedia.');
        $zip = new ZipArchive;
        abort_unless($zip->open($file->getRealPath(), ZipArchive::RDONLY) === true, 422, 'Dokumen Office tidak valid.');
        try {
            abort_if($zip->numFiles > 1000, 422, 'Dokumen Office melewati batas arsip.');
            $total = 0;
            $seen = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $entry = $zip->statIndex($i);
                abort_unless($entry !== false, 422, 'Dokumen Office tidak valid.');
                $name = $entry['name'];
                $total += $entry['size'];
                abort_if($total > 50 * 1024 * 1024 || isset($seen[$name])
                    || preg_match('~(^/|\\\\|(?:^|/)\.\.(?:/|$)|vbaproject\.bin$)~i', $name)
                    || ($entry['encryption_method'] ?? 0) !== 0, 422, 'Dokumen Office melewati batas atau tidak didukung.');
                $seen[$name] = true;
            }
            foreach (['[Content_Types].xml', '_rels/.rels', $main] as $required) {
                abort_unless(isset($seen[$required]), 422, 'Arsip bukan dokumen Office yang sesuai.');
            }
            $contentTypes = $zip->getFromName('[Content_Types].xml', 1024 * 1024 + 1);
            // No extraction or XML entity expansion; only inspect bounded package metadata.
            abort_unless(is_string($contentTypes) && strlen($contentTypes) <= 1024 * 1024
                && ! preg_match('/<!DOCTYPE|<!ENTITY|macroEnabled/i', $contentTypes), 422, 'Metadata dokumen Office tidak valid.');
            $previous = libxml_use_internal_errors(true);
            try {
                $xml = simplexml_load_string($contentTypes, \SimpleXMLElement::class, LIBXML_NONET);
                abort_unless($xml !== false && $xml->getName() === 'Types', 422, 'Metadata dokumen Office tidak valid.');
                $valid = false;
                foreach ($xml->children('http://schemas.openxmlformats.org/package/2006/content-types')->Override as $override) {
                    $attributes = $override->attributes();
                    if ((string) $attributes['PartName'] === '/'.$main && (string) $attributes['ContentType'] === $mime.'.main+xml') {
                        $valid = true;
                    }
                }
                abort_unless($valid, 422, 'Jenis paket Office tidak sesuai ekstensi.');
            } finally {
                libxml_clear_errors();
                libxml_use_internal_errors($previous);
            }
        } finally {
            $zip->close();
        }
    }
}
