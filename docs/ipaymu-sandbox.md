# iPaymu sandbox

Integrasi pembayaran redirect iPaymu sandbox digunakan oleh LAZSIP (zakat dan infak) serta SARSIP (donasi). Semua transaksi sandbox hanya untuk pengujian dan tidak memindahkan uang nyata. Mode `simulation` tetap tersedia untuk pengujian lokal tanpa menghubungi iPaymu.

## Konfigurasi

Isi nilai berikut di `api/.env`. Jangan commit API key atau kredensial sandbox:

```dotenv
PAYMENT_GATEWAY=ipaymu_sandbox
PAYMENT_PUBLIC_URL=https://frontend-pengujian.example.com
PAYMENT_API_URL=https://backend-pengujian.example.com/api/v1
IPAYMU_VA=ISI_VA_SANDBOX
IPAYMU_API_KEY=ISI_API_KEY_SANDBOX
IPAYMU_BASE_URL=https://sandbox.ipaymu.com/api/v2
```

`PAYMENT_PUBLIC_URL` adalah origin Next.js yang dapat dibuka pengguna. `PAYMENT_API_URL` adalah URL publik API Laravel, termasuk `/api/v1`. Aplikasi membatasi endpoint gateway ke host sandbox iPaymu selama mode ini aktif. Restart Laravel setelah mengubah `.env` atau jalankan `php artisan config:clear` jika konfigurasi pernah di-cache.

Jalankan migrasi setelah mengambil perubahan terbaru:

```powershell
cd api
php artisan migrate
```

## Alur pembayaran

1. Pengguna membuat transaksi dari checkout LAZSIP atau SARSIP.
2. Laravel membuat sesi pembayaran dengan request yang ditandatangani memakai VA dan API key sandbox.
3. Next.js mengarahkan pengguna ke URL pembayaran sandbox dari iPaymu.
4. iPaymu mengirim callback ke endpoint Laravel berikut:

   `https://backend-pengujian.example.com/api/v1/payment/webhook/ipaymu`

5. Laravel memverifikasi `X-Signature`, merchant, referensi, ID sesi, dan nominal sebelum mengubah transaksi menjadi lunas atau gagal.
6. Tombol **Cek status ke iPaymu** meminta Laravel mengecek transaksi langsung ke API sandbox. Proses callback dan pemeriksaan status bersifat idempoten sehingga transaksi yang sama tidak menambah total campaign dua kali.

Untuk pengembangan lokal, callback membutuhkan tunnel HTTPS atau deployment pengujian yang dapat dijangkau iPaymu. Tanpa URL publik, pembuatan sesi dan pengecekan status dari Laravel tetap dapat berjalan, tetapi callback otomatis tidak dapat mencapai localhost.

## Pengujian

Gunakan akun dan data donor uji. Uji sedikitnya status pending, berhasil, dibatalkan atau kedaluwarsa, callback berulang, dan pemeriksaan status berulang. Pembayaran sandbox masuk ke database pengujian sebagai transaksi `paid`, tetapi dikecualikan dari ringkasan keuangan dan rekonsiliasi transaksi nyata.

Pemeriksaan kontrak lokal dapat dijalankan tanpa memanggil layanan eksternal:

```powershell
cd api
php artisan test
php tools/verify-migration.php
```

Pengujian pembayaran pada halaman iPaymu memerlukan VA dan API key sandbox yang aktif dari dashboard iPaymu.
