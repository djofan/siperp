# Tanwir Qurani — pengujian lokal

## Uji otomatis

```bash
npm run test:tanwir
npm test
npm run typecheck
```

`test:tanwir` menjalankan Pest/Laravel pada `api/tests/Feature/TanwirWorkflowTest.php`, memakai SQLite **dalam memori** dan penyimpanan file palsu. Tes tidak membutuhkan MySQL, akun demo, atau layanan API yang sedang berjalan. Dependensi PHP harus terpasang di `api/vendor`.

Cakupan tes:

- Login kode akun, penolakan akun nonaktif, dan modul nonaktif.
- Pembuatan akun dan kelompok oleh admin, kode otomatis yang tidak bisa diubah.
- Distribusi tugas ke kelompok PIC dan pembatasan peserta tanpa kelompok.
- Setoran → tolak dengan alasan → kirim ulang → setujui, percobaan dan riwayat, serta penghapusan file setoran lama.
- Tenggat terkunci, perpanjangan oleh pembuat (1–72 jam), penanda terlambat, dan edit judul yang mempertahankan detik tenggat hasil perpanjangan.
- Kuis sekali kerjakan, semua soal wajib dijawab, pilihan kosong ditolak, nilai otomatis, kunci tidak terbuka sebelum pengerjaan, soal/tipe dikunci setelah pengumpulan, dan kuis tidak masuk antrean koreksi.
- Deteksi track audio MP4 berlabel isom, penolakan video untuk tugas suara, file palsu, dan ukuran di atas 50 MB.
- Hak akses file setoran, foto profil, serta kelola anak didik sesuai lingkup.

## Uji manual dengan akun lokal

Script lama `db:seed:tanwir-demo` sudah tidak tersedia setelah migrasi backend ke Laravel. Buat akun uji guru, peserta, dan kelompok melalui `/admin/tanwir` menggunakan admin lokal. Aktifkan modul melalui `/admin/super/modul`, lalu masuk di `/tanwir/masuk` menggunakan kode akun yang terbit.

Gunakan profil browser terpisah untuk admin, guru, dan peserta agar sesi tidak saling menggantikan. Periksa tampilan layar 360 px, perekaman dan pratinjau audio/video, unggahan dan pemutaran file, koreksi, profil, peta, serta tautan WhatsApp. Tautan WhatsApp hanya membuka pesan siap kirim.

## Verifikasi perangkat yang masih diperlukan

Tes API tidak membuktikan dukungan perangkat. Uji perekaman langsung pada Chrome Android dan Safari iOS di HP sungguhan, termasuk izin mikrofon/kamera, rekam ulang, batas ukuran, putus koneksi, unggah, dan putar ulang. Gunakan HTTPS atau localhost agar browser mengizinkan akses media.

## Penyimpanan saat deploy

Backend sekarang menyimpan file privat melalui disk Laravel `local`, pada subdirektori `tanwir/`. Volume tersebut harus persisten dan masuk backup. File dibuka melalui endpoint berizin `/api/tanwir/files/...`, bukan direktori publik. Pastikan batas unggahan PHP (`upload_max_filesize`, `post_max_size`) dan proxy mencukupi file 50 MB beserta overhead multipart.
