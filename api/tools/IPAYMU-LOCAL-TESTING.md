# Pengujian iPaymu lokal

Backend tetap di `127.0.0.1:8000`; frontend di `localhost:3000`.

Jalankan migration antrean, lalu worker terpisah (wajib untuk callback/email):

```powershell
php artisan migrate
php artisan queue:work payment --queue=callbacks,receipts --sleep=1 --tries=5 --timeout=60
```

Callback hanya memvalidasi signature dan menyimpan job ke MySQL sebelum merespons 200. Worker memverifikasi transaksi melalui API iPaymu, lalu memproses email di antrean terpisah. Koneksi antrean payment menggunakan database secara eksplisit walaupun QUEUE_CONNECTION aplikasi masih sync. Worker harus tetap hidup; di server gunakan process supervisor. Pantau `php artisan queue:failed` dan jalankan `queue:retry ID` setelah penyebab kegagalan diperbaiki. Jangan hapus antrean untuk menutupi error.

Untuk callback dari internet, jalankan proxy khusus webhook:

```powershell
node api/tools/ipaymu-callback-proxy.mjs
api/storage/app/cloudflared.exe tunnel --url http://127.0.0.1:8011 --no-autoupdate
```

Binary cloudflared lokal tidak diikutkan Git. Jika belum tersedia, gunakan binary resmi Cloudflare. Proxy hanya meneruskan **POST /api/v1/payment/webhook/ipaymu**. Endpoint lain ditolak. Jangan mengekspos port 8000 langsung lewat tunnel.

Salin origin HTTPS tunnel ke `api/.env`:

```dotenv
PAYMENT_API_URL=https://NAMA-TUNNEL.trycloudflare.com/api/v1
```

Jalankan `php artisan config:clear`. Jangan ubah `PAYMENT_PUBLIC_URL` localhost untuk return browser. Tunnel sementara bisa berubah saat dijalankan ulang. Setelah tunnel mati, callback tidak dapat masuk. Pada staging/produksi gunakan origin HTTPS tetap.

URL notifikasi dikirim saat **sesi baru** dibuat. Sesi lama dapat masih menunjuk URL lama; gunakan Tes Notify di dashboard sandbox atau rekonsiliasi terverifikasi. Jangan membuat pembayaran ulang untuk transaksi yang sudah dibayar.

## Rekonsiliasi

Pembacaan status checkout/pelacakan mengantrekan rekonsiliasi otomatis dengan cooldown 60 detik per transaksi. Jika ID gateway belum ada, worker mencari referensi yang sama pada riwayat merchant, maksimal 5 halaman terbaru, kemudian memvalidasi endpoint detail (referensi, sesi, akun, subtotal, PaidStatus) sebelum menyimpan status. Ini jalur cadangan jika callback tidak diterima; pembacaan UI tidak menunggu HTTP ke iPaymu. Untuk volume tinggi yang melewati batas penelusuran ini, gunakan rekonsiliasi admin yang terverifikasi. Scheduler `payment:sync-pending` juga mengantrekan transaksi yang sudah memiliki sesi, bukan hanya yang memiliki ID gateway.

`IpaymuService::sync($transaction, $candidateGatewayId)` hanya untuk proses backend tepercaya. Verifikasi akun konfigurasi, ID, reference, session, subtotal, dan PaidStatus wajib lolos sebelum ID/status disimpan. Tidak ada endpoint publik untuk memasukkan ID sewenang-wenang.

- Status 1: `paid`, gateway state `settled`.
- Status 6: `paid`, gateway state `unsettled` (bukan bukti saldo bank sudah cair).
- Status 7: gateway state `escrow`; status database tetap pending untuk mengecualikannya dari total lunas yang dapat digunakan. API publik, tabel admin dan riwayat email menampilkan `escrow`, bukan menunggu pembayaran.
- Escrow tidak menampilkan tombol bayar ulang. Sinkronkan lagi setelah status provider berubah.
- Tombol tandai lunas/gagal hanya untuk simulasi, bukan transaksi iPaymu.

Pengujian callback sintetis bertanda tangan memvalidasi transport dan handler, tetapi tidak membuktikan provider sudah mengirim callback nyata. Tes transaksi sandbox baru tetap diperlukan untuk memverifikasi alur provider end-to-end.

Semua tes otomatis menggunakan HTTP palsu dan database uji terpisah, bukan MySQL aplikasi. Jangan menonaktifkan validasi SSL untuk mengatasi konfigurasi CA PHP.
