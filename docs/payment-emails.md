# Email konfirmasi pembayaran

Pembayaran berhasil menghasilkan satu email per transaksi: zakat LAZSIP (maal/fitrah), donasi campaign LAZSIP, atau donasi campaign SARSIP. Nama asli hanya dipakai di email pribadi; preferensi anonim pada daftar publik tidak berubah. SARSIP sekarang memiliki email opsional. Tanpa email pada data donatur, notifikasi dilewati.

Email konfirmasi berbeda dari email kode pelacakan yang dikirim saat checkout. Receipt hanya dibuat ketika status beralih ke paid, termasuk pembayaran manual yang dicatat admin. Sandbox dan simulasi ditandai SIMULASI agar tidak dianggap bukti penerimaan dana nyata. Transaksi paid lama tidak dikirim massal.

## Konfigurasi

Tambahkan di `.env` (jangan commit rahasia):

```dotenv
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=SIP <notifikasi@domain-terverifikasi-anda.id>
```

Verifikasi domain pengirim di Resend, lalu restart server. Gunakan alamat uji milik sendiri untuk pengujian pengiriman. Implementasi diuji dengan respons tiruan, bukan email ke donatur nyata.

Terapkan migration `20260929090000_payment_receipts`, jalankan `npx prisma generate`, lalu restart dev server. Migrasi hanya menambah tabel antrean receipt.

## Pengiriman dan percobaan ulang

Antrean disimpan atomik bersama status paid. Penerima, isi, dan pengirim dibekukan agar retry tidak berubah mengikuti edit profil. Pengiriman langsung dicoba setelah commit. Kegagalan layanan email tidak membatalkan pembayaran.

Jalankan `npm run email:retry` untuk memproses sampai 50 antrean yang jatuh tempo. Untuk pengiriman ulang otomatis tanpa menunggu webhook berikutnya, jalankan perintah tersebut setiap menit melalui scheduler pada server deployment. Scheduler belum dipasang oleh fitur ini. Tanpa konfigurasi Resend, antrean tetap pending.

Status tabel `payment_receipts`: pending (menunggu konfigurasi/pengiriman), sending, retry (gagal sementara), sent (diterima API Resend, bukan jaminan masuk inbox), needs_review. Data tabel ini privat, tidak diberikan melalui endpoint status publik.

Klaim atomik mencegah pengiriman paralel. Semua percobaan memakai Idempotency-Key yang sama. Karena [Resend menyimpan kunci selama 24 jam](https://resend.com/changelog/idempotency-keys), percobaan berhenti setelah 23 jam dari upaya pertama. Untuk needs_review, periksa log Resend sebelum tindakan manual; jangan menghapus antrean/reset timestamp tanpa memastikan email sebelumnya belum terkirim.
