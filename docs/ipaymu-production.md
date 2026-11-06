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
