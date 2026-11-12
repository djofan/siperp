# iPaymu produksi

Mode produksi memakai API redirect iPaymu v2. Isi rahasia langsung melalui environment server Laravel dan jangan menyimpannya di Git.

```env
PAYMENT_GATEWAY=ipaymu
PAYMENT_PUBLIC_URL=https://donasi.example.org
PAYMENT_API_URL=https://api.example.org/api/v1

IPAYMU_VA=VA_PRODUKSI
IPAYMU_API_KEY=API_KEY_PRODUKSI
IPAYMU_BASE_URL=https://my.ipaymu.com/api/v2
```

`PAYMENT_PUBLIC_URL` adalah origin Next.js. `PAYMENT_API_URL` adalah URL publik Laravel beserta `/api/v1`. Keduanya wajib memakai HTTPS dalam mode produksi. Backend hanya menerima checkout produksi dari `my.ipaymu.com` dan memvalidasi signature callback menggunakan VA produksi.

Sebelum aktivasi:

1. Daftarkan domain frontend, domain API, dan IP statis server di dashboard produksi iPaymu.
2. Pastikan endpoint `POST /api/v1/payment/webhook/ipaymu` dapat diakses iPaymu melalui internet.
3. Atur `CORS_ALLOWED_ORIGINS` Laravel ke origin frontend produksi.
4. Jalankan `php artisan config:clear` lalu `php artisan config:cache`.
5. Buat transaksi baru bernominal kecil, selesaikan pembayaran, dan pastikan status berubah dari `pending` menjadi `paid` melalui callback.

Transaksi `ipaymu` adalah transaksi uang nyata dan masuk ke laporan keuangan. Transaksi `ipaymu_sandbox` tetap dianggap pengujian dan tidak masuk laporan produksi.

## Memeriksa 401 Unauthorized Signature di VPS

Rumus HMAC mengikuti contoh resmi iPaymu. JSON dibentuk sekali dengan
`JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE`, SHA-256 menghasilkan hex huruf kecil, StringToSign adalah
`POST:VA:bodyHash:ApiKey`, lalu HMAC-SHA256 memakai API key sebagai key. Body JSON
yang dihitung adalah string yang sama persis dengan body HTTP, tanpa serialisasi ulang.
Header `va`, `signature`, `timestamp` (Asia/Jakarta, `YmdHis`) dikirim bersama Content-Type JSON.
Spasi tepi VA/API key dinormalisasi; whitespace di tengah API key ditolak.

Setelah deploy, dari direktori `api` jalankan:

```bash
php artisan config:clear
php artisan config:cache
php artisan queue:restart
php artisan payment:ipaymu-check
php artisan payment:ipaymu-check --remote
```

Perintah pertama hanya memeriksa konfigurasi lokal. Opsi `--remote` melakukan
`POST /api/v2/balance` untuk memeriksa autentikasi; tidak membuat sesi checkout,
tidak mengubah status transaksi, dan tidak menampilkan VA, API key, signature maupun saldo.

| Hasil | Tindak lanjut |
| --- | --- |
| `IPAYMU_AUTH_OK` | Signature dan kredensial diterima untuk endpoint cek koneksi. Lanjutkan pemeriksaan checkout serta status verifikasi/domain secara terpisah. |
| `IPAYMU_SIGNATURE_REJECTED` | Cocokkan VA/API key dengan pasangan dari dashboard produksi akun yang sama. Pastikan environment PHP-FPM dan CLI sama, cache konfigurasi diperbarui, serta jam VPS tersinkron. |
| `IPAYMU_DOMAIN_REJECTED` / `IPAYMU_IP_REJECTED` | Periksa persetujuan domain/IP sesuai respons, bukan mengganti rumus signature. IP yang sudah aktif tidak perlu didaftarkan ulang. |
| `IPAYMU_CONFIGURATION_INVALID` | Periksa mode, endpoint produksi dan URL publik HTTPS; hindari whitespace di tengah key. |
| `IPAYMU_CONNECTION_FAILED` | Periksa DNS, TLS/sertifikat, koneksi outbound, dan waktu server. |

`AUTH_OK` tidak berarti domain atau merchant sudah disetujui. Jika IP outbound sudah
aktif menurut CS iPaymu, tidak perlu mendaftarkannya ulang untuk mengatasi signature.
Jangan mengirim isi `.env`, key, signature, atau raw response ke chat/log publik.
Setelah penolakan HTTP 401 yang pasti, sesi dapat dicoba kembali memakai transaksi
pending yang sama; jangan membuat donasi berulang untuk mencoba konfigurasi.

Referensi: [panduan signature](https://docs.ipaymu.com/id/docs/signature),
[contoh PHP resmi](https://github.com/ipaymu/ipaymu-payment-v2-sample-php/blob/main/ipaymu.php),
[cek koneksi melalui saldo](https://docs.ipaymu.com/id/docs/balance/check-balance).

## Timeout untuk respons provider yang lambat

`api/.env` mendukung `IPAYMU_TIMEOUT=90` (detik, dibatasi 60–120) dan
`IPAYMU_CONNECT_TIMEOUT=15`. Berlaku untuk checkout, balance, history, dan detail
transaksi. Signature tetap menggunakan byte JSON yang dikirim. Tidak ada retry
HTTP otomatis pada pembuatan sesi; timeout tetap memerlukan rekonsiliasi sebelum
mengulang pembayaran.

Seluruh pencarian history dan verifikasi detail berbagi batas total dua kali
`IPAYMU_TIMEOUT` (180 detik secara default). Job callback/rekonsiliasi mendapat
tambahan 30 detik, dan reservasi antrean payment tambahan 60 detik lagi. Job
rekonsiliasi mendukung produksi serta sandbox, sesuai mode transaksi aktif.

Saat deployment, muat ulang cache konfigurasi dan restart worker agar job baru
memakai batas terbaru. Selesaikan job lama sebelum menghentikan worker. Untuk
systemd worker gunakan `--timeout=270` dan `TimeoutStopSec=300`; nilai tersebut
mencakup seluruh rentang konfigurasi. Next.js meneruskan request maksimal 300 detik.
Pada blok Nginx frontend pastikan `proxy_read_timeout 300s;`, dan pada location PHP
backend pastikan `fastcgi_read_timeout 300s;`. Periksa pula batas PHP-FPM
`request_terminate_timeout` bila diaktifkan: gunakan setidaknya 300 detik.
Validasi konfigurasi sebelum reload layanan. Perubahan kode ini tidak mengubah
konfigurasi Nginx/systemd VPS secara otomatis dan tidak memerlukan migration.

Setelah deployment jalankan `php artisan payment:ipaymu-check --remote`.
Tes tersebut hanya memeriksa autentikasi tanpa membuat pembayaran atau menampilkan saldo.

### Diagnosis serialisasi dan transport checkout

Checkout menggunakan `json_encode(..., JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)`;
Unicode dikirim sebagai UTF-8 langsung, `qty` dan `price` tetap angka JSON. Byte yang
ditandatangani dikirim melalui `withBody`, tanpa serializer JSON kedua. Tes
transport memeriksa body PSR-7 setelah middleware Guzzle, termasuk Unicode,
URL, angka, Content-Length, signature dan larangan redirect. Tes lokal tidak
membuktikan penerimaan request oleh provider.

Request API bertanda tangan tidak mengikuti redirect otomatis. Respons selain
2xx atau kegagalan koneksi mencatat `iPaymu transport diagnostic.` di log Laravel:
endpoint, runtime CLI/FPM, status HTTP, durasi milidetik, kode cURL bila tersedia,
serta boolean `body_unchanged`, `signature_header_unchanged`, `method_is_post`, dan
`contains_unicode_escape`. Tidak ada body, hash, signature, VA, API key, isi respons,
atau data donatur dalam catatan tersebut. Kegagalan menulis log tidak mengganti
hasil request pembayaran. TLS tetap diverifikasi.

Setelah deploy dan restart PHP-FPM/worker, bandingkan log checkout `/payment`
dengan tes baca-saja `/balance` melalui `payment:ipaymu-check --remote`:

```bash
grep -F 'iPaymu transport diagnostic.' storage/logs/laravel.log | tail -n 10
```

`body_unchanged=false` menunjukkan perubahan setelah signing di sisi aplikasi.
HTTP 3xx menunjukkan redirect yang kini dihentikan, bukan diteruskan menggunakan
signature lama. `curl_error=28` menunjukkan timeout. Jika HTTP 401 tetap terjadi
dengan body, header, dan method utuh, log itu belum membuktikan kesalahan rumus
signature ataupun penyebab penolakan di provider. Jangan mengganti escape JSON,
tipe angka atau kredensial secara acak, dan jangan mengulang checkout otomatis.

### Pembanding Unicode baca-saja

```bash
php artisan payment:ipaymu-unicode-check
php artisan payment:ipaymu-unicode-check --remote
```

Tanpa `--remote` tidak ada jaringan. Dengan opsi tersebut, tiga POST berurutan
hanya menuju `/balance`: kontrol dengan `account`, lalu dua body dengan nilai
`account` dan `description` yang identik. Description statis mengandung `— É 日本`.
Varian `unicode_escaped` mempertahankan escape Unicode sebagai pembanding lama;
`unicode_utf8` memakai karakter UTF-8 langsung seperti checkout saat ini. Masing-masing menandatangani
byte body yang dikirim; timeout dan TLS tetap sama. Tidak ada retry otomatis,
akses transaksi database, perubahan status atau pembuatan pembayaran. Kegagalan
koneksi satu varian tidak mencegah pemeriksaan varian berikutnya. Hasil dicetak
setelah setiap request; total dapat mencapai tiga kali timeout request.

Output hanya varian, kode diagnosis, HTTP/provider status dan durasi. Tidak
menampilkan saldo, kredensial, signature, body maupun isi exception. Kolom
`description` bukan parameter balance yang dijamin didukung provider; respons
validasi/penolakan dapat membuat hasil belum konklusif. Kontrol gagal/timeout juga
tidak membuktikan masalah serialisasi. Jika semua berhasil, kedua encoding diterima
di balance tetapi checkout masih perlu ditelusuri terpisah. Jika hanya satu encoding
diterima, itu petunjuk untuk pemeriksaan provider, bukan alasan mengganti serializer
checkout secara otomatis. Command tidak mengubah encoding checkout.

Pada uji VPS 11 November 2026, kontrol diterima (HTTP 200), Unicode escaped
ditolak sebagai signature (HTTP 401), dan UTF-8 langsung diterima (HTTP 200).
Berdasarkan perbandingan tersebut, default serializer request iPaymu kini memakai
UTF-8 langsung. Probe tetap secara eksplisit menguji kedua encoding. Ini belum
membuktikan checkout production berhasil; setelah deploy, uji satu kali memakai
transaksi pending yang sama dan periksa hasilnya. Tidak perlu migration database.

Jika HTTP checkout tidak melempar error tetapi status provider, SessionID atau URL
tidak lolos validasi, log `iPaymu checkout response validation failed.` mencatat
tipe status/session/URL, boolean kelengkapan, status HTTP, ID transaksi, dan hostname
URL saja. Path, query, fragment, SessionID dan isi respons tidak dicatat. URL baru
tidak otomatis dipercaya; periksa hostname dan format resmi sebelum mengubah
allowlist. Hasil sesi tetap ditandai belum pasti sehingga tidak dibuat ulang otomatis.

### Respons hosted checkout dan pemulihan sesi

Produksi menerima URL HTTPS pada host tepat `my.ipaymu.com` dengan path `/payment/…`,
atau `payment.ipaymu.com` dengan path root (termasuk sesi di fragment). Sandbox tetap
menggunakan host sandbox. Host tiruan/subdomain tambahan, userinfo, port selain 443,
backslash dan whitespace/control ditolak. Status sukses provider menerima angka
`200` atau string `"200"`; SessionID tetap wajib string terisi. Dukungan format ini
memperbaiki keterbatasan validator, tetapi bukan bukti bahwa respons checkout lama
memakai format tersebut.

Jika validasi respons checkout gagal pada transaksi tersimpan, aplikasi menyimpan
hanya metadata transaksi, status, SessionID dan URL yang diperlukan untuk recovery
ke disk `local`, folder `payment/ipaymu-session-evidence/`, dalam bentuk terenkripsi
dengan APP_KEY. Tidak ada raw response, data donatur, saldo atau API key dalam bukti.
Folder ini berada di `storage/app/private`, tidak dilayani web. Kegagalan penyimpanan
tidak mengubah hasil pembayaran; log mencantumkan `evidence_preserved`.
Pada VPS, pastikan folder privat dapat diakses FPM dan worker melalui grup www-data:

```bash
install -d -o siperp -g www-data -m 2770 \
  /var/www/siperp/api/storage/app/private/payment \
  /var/www/siperp/api/storage/app/private/payment/ipaymu-session-evidence
```

Pemeriksaan bukti (tanpa request jaringan, tanpa perubahan database):

```bash
php artisan payment:ipaymu-recover-session ID_TRANSAKSI
```

`NO_EVIDENCE` berarti tidak ada bukti tersimpan dan transaksi tidak dibuka ulang.
Respons lama sebelum fitur ini tidak dapat dipulihkan dari log. `EVIDENCE_VALID`
berarti bukti berhasil didekripsi dan sesuai dengan transaksi, mode, akun, referensi,
status sukses, SessionID dan allowlist URL. Untuk menerapkan bukti yang sudah valid:

```bash
php artisan payment:ipaymu-recover-session ID_TRANSAKSI --apply
```

Apply mengunci baris database dan hanya berlaku untuk transaksi pending berstatus
`needs_review` yang belum memiliki sesi/URL. Hasilnya `ready`, bukan `paid`.
Tidak ada reset menjadi `not_started`, pembuatan checkout ulang, atau penggantian
transaksi lunas. Output tidak menampilkan SessionID/URL. Bukti tetap privat untuk
audit dan ikut backup storage; simpan APP_KEY asli agar tetap bisa didekripsi.
