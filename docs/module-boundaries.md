# Batas modul

Arsitektur saat ini adalah modular monolith, bukan aplikasi atau database terpisah.

## Aturan

- Modul bisnis tidak mengimpor implementasi modul bisnis lain.
- Core (identitas/otorisasi) dan Payment (transaksi) adalah kapabilitas platform bersama.
  Akses model dan layanan platform masih diperbolehkan; ini merupakan dependensi
  yang disengaja, bukan jaminan setiap folder dapat dihapus atau dideploy sendiri.
- Kontrak backend berada di `api/app/Contracts`; tipe frontend di
  `contracts/modules`. Kontrak tidak mengimpor implementasi modul.
- Provider modul mendaftarkan adapter miliknya sendiri. Registry menyelesaikan
  adapter secara lazy hanya ketika diperlukan.
- Aturan peserta, sesi, sumber kontak, ringkasan dashboard, serta metadata dan
  persiapan pembayaran dimiliki modul sumber, bukan ditanamkan dalam Core/Payment.
- Upload generik ada di Support. UI generik ada di components, bukan dimiliki
  salah satu modul bisnis. Perhitungan biaya murni ada di lib/payments.
- Dashboard menandai sumber gagal di `unavailableModules`; sinkronisasi kontak
  gagal secara eksplisit agar tidak diam-diam menghilangkan data.

## Verifikasi

`npm test` memeriksa larangan impor implementasi lintas modul bisnis dan batas
kontrak. Pengujian PHP mencakup isolasi registry, callback antrean, serta smoke
test lintas modul memakai SQLite in-memory; tidak mengubah database aplikasi.

## Batas yang masih ada

Runtime, database, identitas pengguna, konfigurasi deployment, dan Payment masih
dipakai bersama. Foreign key, migrasi, frontend routing, dan permission tetap
perlu ditinjau sebelum melepas modul sebagai aplikasi mandiri. Pengujian batas
impor bukan bukti isolasi proses, query SQL, atau kegagalan infrastruktur.
