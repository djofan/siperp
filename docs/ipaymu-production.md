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

Rumus request mengikuti contoh PHP resmi iPaymu: JSON dibentuk sekali dengan
`JSON_UNESCAPED_SLASHES`, SHA-256 menghasilkan hex huruf kecil, StringToSign adalah
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
