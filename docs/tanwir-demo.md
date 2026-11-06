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
- Deteksi track WebM: audio memakai MIME `audio/webm`, video ditolak untuk tugas suara, audio ditolak untuk tugas video, dan header WebM palsu ditolak.
- Hak akses file setoran, foto profil, serta kelola anak didik sesuai lingkup.

## Uji manual dengan akun lokal

Script lama `db:seed:tanwir-demo` sudah tidak tersedia setelah migrasi backend ke Laravel. Buat akun uji guru, peserta, dan kelompok melalui `/admin/tanwir` menggunakan admin lokal. Aktifkan modul melalui `/admin/super/modul`, lalu masuk di `/tanwir/masuk` menggunakan kode akun yang terbit.

Gunakan profil browser terpisah untuk admin, guru, dan peserta agar sesi tidak saling menggantikan. Periksa tampilan layar 360 px, perekaman dan pratinjau audio/video, unggahan dan pemutaran file, koreksi, profil, peta, serta tautan WhatsApp. Tautan WhatsApp hanya membuka pesan siap kirim.

## Verifikasi perangkat yang masih diperlukan

Tes API tidak membuktikan dukungan perangkat. Uji perekaman langsung pada Chrome Android dan Safari iOS di HP sungguhan, termasuk izin mikrofon/kamera, rekam ulang, batas ukuran, putus koneksi, unggah, dan putar ulang. Gunakan HTTPS atau localhost agar browser mengizinkan akses media.

## Hasil QA 5 November 2026

Pengujian browser memakai Next.js lokal dan backend Laravel dengan SQLite **dalam memori**, akun/data sintetis, serta storage QA terpisah. Database MySQL dan upload pengguna tidak dipakai. Ini pengujian browser desktop dengan viewport mobile, belum pengujian HP fisik.

Alur yang berhasil diverifikasi lewat UI pada lebar 360 px:

- Admin membuat guru, kelompok dengan PIC, dan peserta; kode otomatis terbit dan login sesuai peran berhasil.
- Guru membuat tugas suara, video, dan kuis; peserta melihat tugas kelompoknya.
- Peserta memilih berkas WAV/WebM, melihat pratinjau, dan mengirim setoran; audio privat dapat diputar dan video privat memuat metadata tanpa error media.
- Guru menolak audio dengan catatan, peserta mengirim ulang, percobaan menjadi 2, lalu guru menyetujui. Riwayat penolakan tetap tersedia. Video juga berhasil disetujui.
- Kuis memberi nilai 100 untuk jawaban benar; hasil dan jawaban dapat dilihat peserta dan guru, serta kuis tidak masuk antrean koreksi.
- Tugas terkunci setelah tenggat; guru memperpanjang satu jam. Pengumpulan pada masa perpanjangan diterima dan ditandai terlambat terhadap tenggat awal.
- Peserta membuat anak didik dan menyimpan perubahan profil tanpa mengganti foto.
- Profil dengan nomor HP tidak valid dan kuis dengan soal belum lengkap menampilkan alasan validasi; draf form dan pilihan tipe tugas tetap tersedia untuk diperbaiki.

Pemeriksaan layout: enam halaman publik (beranda, tentang, program, FAQ, kontak, masuk), halaman admin, serta alur guru/peserta diperiksa pada 360 px. Profil dan hasil setoran diperiksa juga pada lebar 320, 390, 768, dan 1024 px; tidak ditemukan overflow horizontal dokumen. Pemeriksaan ini mencakup halaman dan data yang disebutkan, bukan seluruh kombinasi konten/perangkat.

Perbaikan dari QA:

- Validasi WebM kini memeriksa track audio/video, termasuk Segment berukuran belum diketahui dari MediaRecorder; video tidak lagi diterima sebagai tugas suara.
- Input foto kosong tidak diteruskan sebagai pengganti foto saat mengubah profil.
- Form Tanwir menampilkan pesan validasi/konflik API yang relevan, dengan pesan umum untuk error server/internal.
- Reset otomatis React setelah action mengembalikan error dicegah pada form data, tugas, kuis, dan koreksi agar draf tidak hilang dan radio tetap sesuai state. Form password tetap memakai perilaku reset semula.

Hasil pemeriksaan otomatis pada revisi QA: `test:tanwir` 14 tes/106 assertion lulus; suite backend lengkap 415 tes/3.426 assertion lulus; empat regresi frontend Tanwir lulus; typecheck, ESLint lingkup Tanwir, Pint pada file PHP yang diubah, pemeriksaan drift OpenAPI, serta build production lulus. `npm test` keseluruhan: 141 lulus, 2 gagal yang sudah ada sebelum perubahan, pada pengelolaan akun Core (`account-code-login.test.mjs`) dan tampilan Bantuan (`bantuan-usability.test.mjs`).

Catatan lingkungan Windows: kegagalan bootstrap Pest sebelumnya berasal dari PHP di sandbox yang melaporkan `is_readable=false` meskipun file dapat dibaca, bukan path `autoload.php` yang salah. Tes dijalankan dengan izin host yang sesuai tanpa melemahkan bootstrap/guard database. Suite lengkap memerlukan ekstensi GD; GD bawaan diaktifkan hanya untuk proses verifikasi dan subprocess-nya, tanpa mengubah `php.ini` global.

## Penyimpanan saat deploy

Backend sekarang menyimpan file privat melalui disk Laravel `local`, pada subdirektori `tanwir/`. Volume tersebut harus persisten dan masuk backup. File dibuka melalui endpoint berizin `/api/tanwir/files/...`, bukan direktori publik. Pastikan batas unggahan PHP (`upload_max_filesize`, `post_max_size`) dan proxy mencukupi file 50 MB beserta overhead multipart.
