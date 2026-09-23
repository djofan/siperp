# Midtrans sandbox

Integrasi Snap Redirect untuk LAZSIP infak/zakat dan SARSIP donasi. Tidak memindahkan uang nyata. Pengaturan rekening tujuan lokal hanya untuk pencatatan jenis dana, bukan instruksi pencairan Midtrans. Multi-rekening belum diaktifkan.

## Konfigurasi

Isi di `.env` lokal, jangan commit nilai rahasia:

```dotenv
PAYMENT_GATEWAY=midtrans_sandbox
MIDTRANS_SERVER_KEY=SB-Mid-server-ISI_DARI_DASHBOARD_SANDBOX
MIDTRANS_MERCHANT_ID=ISI_MERCHANT_ID
PAYMENT_PUBLIC_URL=http://localhost:3000
```

Ambil key dari dashboard Midtrans dalam mode **Sandbox**, Settings / Access Keys. Client Key tidak diperlukan karena menggunakan redirect halaman Snap. Endpoint dibatasi ke sandbox, key produksi ditolak. Restart dev server setelah perubahan env atau Prisma generate.

Migration baru: `20260923090000_midtrans_sandbox_checkout`. Terapkan sesuai prosedur migrasi proyek lalu jalankan `npx prisma generate`. Jangan reset database. Mode default tetap `simulation` jika PAYMENT_GATEWAY belum diisi; transaksi lama mempertahankan modenya.

## Uji bayar

1. Pastikan rekening pencatatan untuk lazsip/zakat, lazsip/infak dan sarsip/donasi tersedia di admin. Gunakan data donor uji.
2. Buka campaign LAZSIP/SARSIP atau kalkulator zakat. Pilih Midtrans Sandbox, isi nominal dan identitas, submit.
3. Simpan kode pelacakan. Klik **Lanjut ke Midtrans (sandbox)**, pilih metode di Snap.
4. Selesaikan pembayaran melalui simulator resmi Midtrans sesuai metode; jangan transfer ke VA sandbox dari aplikasi bank nyata.
5. Kembali ke checkout, klik **Cek status ke Midtrans**. Server mengambil status dari API sandbox, memeriksa order, merchant, mata uang dan total sebelum menandai lunas/gagal.
6. Verifikasi transaksi admin, daftar donatur dan total campaign. Pengujian sandbox masuk ke total paid pada database pengujian ini; gunakan database terpisah sebelum produksi.
7. Uji pembayaran pending, berhasil, kedaluwarsa/gagal, klik checkout berulang, dan cek status berulang. Nilai campaign tidak boleh bertambah dua kali. Tombol simulasi admin menolak transaksi gateway.

## Webhook otomatis

Untuk localhost, sediakan URL HTTPS publik melalui tunnel atau deployment pengujian. Isi PAYMENT_PUBLIC_URL dengan origin tersebut dan konfigurasi **Payment Notification URL** Midtrans:

`https://HOST-PENGUJIAN/api/payment/webhook`

URL localhost tidak dapat menerima webhook Midtrans. Tanpa tunnel, tombol cek status tetap berfungsi melalui koneksi server ke Midtrans. Parameter redirect dari browser tidak dijadikan bukti pembayaran. Webhook memverifikasi signature dan mengambil ulang status dari Midtrans; pengiriman berulang aman.

Jika request pembuatan Snap timeout, transaksi ditandai `needs_review` dan tidak otomatis membuat sesi baru. Periksa order ID di dashboard sandbox dan gunakan cek status. Jangan mengganti order ID atau membuat pembayaran ulang tanpa memastikan status order sebelumnya. Server Key dan Merchant ID harus tetap milik merchant yang sama selama transaksi masih pending.

Referensi: [Snap integration](https://docs.midtrans.com/docs/snap-snap-integration-guide), [Get status](https://docs.midtrans.com/reference/get-transaction-status), [Sandbox payments](https://docs.midtrans.com/docs/testing-payment-on-sandbox).
