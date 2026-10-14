# Teknisi HP

## Access
- Pengelola/superadmin masuk melalui `/admin/login`, kemudian `/admin/teknisi`.
- Buat outlet melalui halaman form terpisah, lalu akun teknisi dengan nama, alamat, nomor HP, password awal, dan outlet.
- Kode PTH dibuat berurutan secara otomatis. Satu teknisi aktif per outlet.
- Teknisi masuk melalui `/teknisi/masuk` memakai PTH/password dan bekerja di `/teknisi/panel`, terbatas pada outletnya sendiri.
- Monitoring hanya membaca. Admin/manajer mengelola outlet, akun, dan koreksi transaksi.

## Flow
1. Pending: pelanggan, nomor HP, tipe HP, keluhan, kelengkapan, estimasi harga/tanggal, dan foto awal.
2. Proses: diagnosa, rencana tindakan, persetujuan perubahan estimasi, dan foto proses. Catat penundaan/persetujuan tanpa menambah menu utama.
3. Ready: evaluasi, checklist fungsi, alasan fungsi yang tidak diuji, foto hasil, garansi, dan satu harga final servis.
4. Finish: konfirmasi pembayaran penuh, metode, nama pengambil, serta waktu bayar/pengambilan. Pemasukan hanya berasal dari transaksi yang sudah dikonfirmasi.

Servis gagal tanpa biaya masuk Dibatalkan. Biaya pengecekan yang disetujui pelanggan masuk Ready terlebih dahulu dan dibedakan dari perbaikan berhasil. Riwayat tidak dihapus. Garansi/revisi membuat tiket baru yang terhubung ke Finish sebelumnya. Koreksi nominal hanya oleh pengelola, dengan alasan dan jejak nilai sebelum/sesudah.

## UI and reports
- Tema gelap dengan aksen hijau; daftar/detail terpisah dari halaman form CRUD.
- Menu: dashboard, Pending, Proses, Ready, Finish, laporan, outlet, dan akun/profil.
- Nota dapat dicetak. Pelacakan publik tidak mengekspos foto, identitas pelanggan, atau catatan internal.
- Laporan bulanan: pembayaran diterima, tagihan Ready terkini, jumlah selesai/gagal, waktu pengerjaan, tren mingguan, perbandingan outlet dan bulan sebelumnya, serta servis lanjutan/garansi.
- Pemasukan adalah omzet, bukan laba bersih.

## Data safety
Migrasi bersifat aditif. Jalankan `prisma migrate deploy` dan `prisma generate`, kemudian restart dev server setelah schema/client berubah. Jangan reset database lokal.

Foto JPEG/PNG/WebP dibatasi 3 per aksi dan 5 MB per foto, dikompresi ke WebP. Disimpan di database dan disajikan hanya lewat endpoint berizin, `private, no-store`.

Tabel katalog lama dipertahankan sebagai arsip tanpa route atau aksi aplikasi. Migrasi final-price menggabungkan nilai historis ke harga final; pembayaran dan audit lama tidak dihapus. Migrasi tidak boleh dijalankan manual berulang di luar Prisma.

## Verification
`node --import tsx --test tests/teknisi-flow.test.ts tests/teknisi-workflow.test.ts`

`node --conditions=react-server --import tsx tests/teknisi-workflow.integration.ts`

Integration creates isolated test records, verifies outlet boundaries and the four stages, then removes only those fixtures.
