<?php

namespace App\Support;

use App\Http\Resources\ErrorResource;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\QueryException;
use Illuminate\Encryption\MissingAppKeyException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/** Public diagnostics contain categories and next steps, never SQL, bindings or secrets. */
class ApiProblem
{
    public static function identify(Throwable $error): array
    {
        if ($error instanceof QueryException) {
            $state = (string) ($error->errorInfo[0] ?? $error->getCode());
            $driver = (int) ($error->errorInfo[1] ?? 0);
            if (in_array($state, ['42S02', '42S22'], true) || in_array($driver, [1054, 1146], true)) {
                return [500, 'DB_SCHEMA_MISMATCH', 'Struktur database server belum sesuai dengan versi aplikasi. Minta admin memeriksa migration database sebelum mencoba kembali.'];
            }
            if (str_starts_with($state, '08') || in_array($driver, [1040, 1042, 1045, 1049, 2002, 2003, 2006, 2013], true)) {
                return [503, 'DB_UNAVAILABLE', 'Aplikasi belum dapat mengakses database. Admin perlu memeriksa layanan database dan konfigurasi koneksinya.'];
            }
            if ($state === '40001' || in_array($driver, [1205, 1213], true)) {
                return [409, 'DB_BUSY', 'Data sedang diproses oleh permintaan lain. Tunggu sebentar, periksa hasil penyimpanan, lalu coba kembali bila belum tersimpan.'];
            }
            if ($driver === 1062 || ($state === '23000' && str_contains(strtolower($error->getPrevious()?->getMessage() ?? ''), 'unique constraint'))) {
                return [409, 'DATA_ALREADY_EXISTS', 'Data yang harus unik sudah digunakan, misalnya kode akun atau email. Periksa daftar akun dan gunakan data yang belum terdaftar.'];
            }
            if (in_array($driver, [1048, 1364, 1406, 1451, 1452], true) || in_array($state, ['23000', '23502', '23503'], true)) {
                return [409, 'DATA_CONSTRAINT', 'Data belum dapat disimpan karena ada isian atau hubungan data yang tidak sesuai. Periksa isian dan pilihan akun; hubungi admin bila tetap gagal.'];
            }
            return [500, 'DB_QUERY_FAILED', 'Database gagal memproses penyimpanan atau pembacaan data. Hubungi admin dengan kode dan ID laporan di bawah.'];
        }
        if ($error instanceof ConnectionException) return [503, 'EXTERNAL_CONNECTION_FAILED', 'Layanan yang diperlukan belum dapat dihubungi. Periksa koneksi server atau coba kembali beberapa saat lagi.'];
        if ($error instanceof MissingAppKeyException) return [503, 'APP_KEY_MISSING', 'Konfigurasi enkripsi aplikasi belum tersedia. Minta admin memeriksa APP_KEY pada konfigurasi server tanpa mengganti kunci yang sudah digunakan.'];
        if ($error instanceof DecryptException) return [500, 'ENCRYPTION_DATA_UNREADABLE', 'Data tersimpan tidak dapat dibaca. Admin perlu memeriksa konfigurasi enkripsi server; jangan mengganti APP_KEY untuk mencoba memperbaikinya.'];
        if ($error instanceof HttpExceptionInterface && $error->getMessage() === 'Request origin is not allowed.') return [403, 'ORIGIN_NOT_ALLOWED', 'Domain website belum diizinkan oleh konfigurasi API. Minta admin menyesuaikan origin frontend pada server.'];
        if ($error instanceof HttpExceptionInterface && $error->getMessage() === 'Account is inactive.') return [401, 'ACCOUNT_INACTIVE', 'Akun ini sedang nonaktif. Hubungi admin untuk memeriksa status akun.'];
        if ($error instanceof HttpExceptionInterface && $error->getStatusCode() === 401 && $error->getMessage() === 'Kode akun atau password salah.') return [401, 'LOGIN_INVALID_CREDENTIALS', 'Kode akun atau password salah. Periksa kembali kode akun dan password Anda.'];
        $status = $error instanceof ValidationException ? 422 : ($error instanceof AuthenticationException ? 401 : ($error instanceof HttpExceptionInterface ? $error->getStatusCode() : 500));
        $defaults = [
            400 => ['INVALID_REQUEST', 'Format permintaan tidak valid. Periksa data lalu coba lagi.'],
            401 => ['SESSION_REQUIRED', 'Sesi login tidak berlaku atau sudah berakhir. Silakan login kembali.'],
            403 => ['ACCESS_DENIED', 'Akun Anda tidak memiliki izin untuk tindakan ini. Hubungi admin modul.'],
            404 => ['RESOURCE_NOT_FOUND', 'Data atau halaman yang diminta tidak ditemukan. Muat ulang daftar dan periksa kembali.'],
            405 => ['METHOD_NOT_ALLOWED', 'Tindakan tidak didukung pada alamat ini. Muat ulang halaman; hubungi admin bila tetap gagal.'],
            409 => ['DATA_CONFLICT', 'Data sudah berubah atau sedang diproses. Muat ulang data sebelum melanjutkan.'],
            413 => ['UPLOAD_TOO_LARGE', 'Ukuran berkas atau permintaan melebihi batas server. Kecilkan berkas lalu unggah kembali.'],
            419 => ['SESSION_EXPIRED', 'Sesi telah berakhir. Login kembali sebelum melanjutkan.'],
            422 => ['VALIDATION_FAILED', 'Periksa kolom yang ditandai. Ada isian yang belum lengkap atau tidak sesuai.'],
            429 => ['TOO_MANY_REQUESTS', 'Terlalu banyak percobaan. Tunggu hingga batas waktu berakhir sebelum mencoba lagi.'],
            502 => ['UPSTREAM_FAILED', 'Layanan pendukung memberi respons yang tidak dapat diproses. Coba lagi nanti atau hubungi admin.'],
            503 => ['SERVICE_UNAVAILABLE', 'Layanan belum tersedia. Admin perlu memeriksa konfigurasi dan layanan server.'],
            504 => ['UPSTREAM_TIMEOUT', 'Layanan pendukung terlalu lama merespons. Periksa apakah data sudah tersimpan sebelum mencoba lagi.'],
        ];
        [$diagnostic, $message] = $defaults[$status] ?? [$status >= 500 ? 'SERVER_INTERNAL_ERROR' : 'REQUEST_REJECTED', $status >= 500 ? 'Server mengalami kesalahan saat memproses permintaan. Hubungi admin dengan kode dan ID laporan di bawah.' : 'Permintaan tidak dapat diproses. Periksa data atau hubungi admin.'];
        // Keep deliberate domain validation messages, not framework exception text.
        if ($error instanceof HttpExceptionInterface && trim($error->getMessage()) !== '' && ! in_array($status, [404, 405, 413, 419, 429], true)) {
            $message = $error->getMessage();
        }
        return [$status, $diagnostic, $message];
    }

    private static function requestId(Request $request): string
    {
        if (! $request->attributes->has('api_problem_id')) $request->attributes->set('api_problem_id', (string) Str::uuid());
        return $request->attributes->get('api_problem_id');
    }

    public static function report(Throwable $error, Request $request): void
    {
        if ($request->attributes->get('api_problem_logged')) return;
        [$status, $diagnostic] = self::identify($error);
        if ($status < 500 && ! $error instanceof QueryException) return;
        $request->attributes->set('api_problem_logged', true);
        $context = ['request_id' => self::requestId($request), 'diagnostic_code' => $diagnostic, 'status' => $status,
            'method' => $request->method(), 'route' => $request->route()?->uri(), 'exception_class' => $error::class,
            'file' => $error->getFile(), 'line' => $error->getLine()];
        if ($error instanceof QueryException) {
            $context['sql_state'] = (string) ($error->errorInfo[0] ?? $error->getCode());
            $context['driver_code'] = $error->errorInfo[1] ?? null;
            // Only an identifier can be extracted; never log the SQL statement or its values.
            if (preg_match('/(?:Unknown column|Table) [\'`]([A-Za-z0-9_.]+)[\'`]/i', $error->getPrevious()?->getMessage() ?? '', $match)) $context['schema_identifier'] = $match[1];
        }
        Log::error('api_request_failed', $context);
    }

    public static function response(Throwable $error, Request $request)
    {
        [$status, $diagnostic, $message] = self::identify($error);
        self::report($error, $request);
        $requestId = self::requestId($request);
        $headers = $error instanceof HttpExceptionInterface ? $error->getHeaders() : [];
        $retryAfter = isset($headers['Retry-After']) && is_numeric($headers['Retry-After']) ? max(0, (int) $headers['Retry-After']) : null;
        if ($status === 429 && $retryAfter !== null) $message = "Terlalu banyak percobaan. Tunggu {$retryAfter} detik sebelum mencoba kembali.";
        $code = match ($status) { 400 => 'bad_request', 409 => 'conflict', 401 => 'unauthenticated', 403 => 'forbidden', 404 => 'not_found', 422 => 'validation_failed', 429 => 'rate_limited', 501 => 'not_implemented', default => $status >= 500 ? 'server_error' : 'request_error' };
        if ($status >= 500 || $error instanceof QueryException) $message .= " (Kode: {$diagnostic}; ID: {$requestId})";
        return (new ErrorResource(['code' => $code, 'message' => $message,
            'details' => $error instanceof ValidationException ? $error->errors() : (object) [],
            'diagnosticCode' => $diagnostic, 'requestId' => $requestId, 'retryAfter' => $retryAfter]))
            ->response()->setStatusCode($status)->withHeaders([...$headers, 'X-Request-ID' => $requestId, 'Cache-Control' => 'no-store, private']);
    }
}
