# Tanwir dan Ojol — pembaruan UI, 8 Oktober 2026

Referensi kode yang dibaca:

- https://github.com/djofan/tanwir-qurani — `7d584503788b03a2e2b82754bec338e2f199eca2`
- https://github.com/djofan/ojol-mengaji — `ffb8befb89f47eff480e3c72e4d163ada83a3eb0`

Pembacaan mencakup route publik, model tugas, halaman kuis peserta, serta resource approval guru. Ini perbandingan alur utama, bukan audit kesetaraan semua fitur.

UI mempertahankan login kode akun melalui Core, route modul, guard akses, field form, validasi, Server Actions, dan handler pengiriman yang sudah ada. Tidak ada perubahan schema, service bisnis, atau API pada pekerjaan UI ini.

Alur yang dibandingkan: penugasan kelompok, setoran audio/video, kuis native sekali pengerjaan dengan nilai otomatis, status menunggu/disetujui/ditolak, kirim ulang setelah ditolak, dan tenggat/perpanjangan dengan penanda terlambat. Pendataan anak didik tersedia pada Tanwir. Approver tambahan tersedia pada Ojol lokal.

Selisih yang ditemukan: model Task Tanwir referensi juga memiliki relasi approvers dan canBeReviewedBy; Tanwir lokal belum memiliki kemampuan tersebut. Menyamakan fitur ini memerlukan perubahan schema, service, kontrol akses, form tugas, serta tes; tidak ditambahkan dalam perubahan tampilan saja. Kesetaraan seluruh fitur dengan repository referensi belum dapat dinyatakan.

Pada revisi brief tekstual, Ojol masih memakai tema hijau dengan sans-serif platform, sedangkan Tanwir memakai Newsreader dan Plus Jakarta Sans. Referensi screenshot serta permintaan berikutnya menjadi acuan revisi terbaru di bawah. CSS tetap dibatasi pada root experience masing-masing modul.

Implementasi brief Tanwir: token bersama, sidebar Admin 240px/collapse 72px, breadcrumb/judul, identitas akun Guru/Peserta, statistik putih, tabel tanpa zebra dengan baris 52px, form dua kolom yang sudah tersedia dengan bar simpan sticky, penanda wajib pada field Admin, status tugas berikon dan berlabel, tanggal + deadline relatif, login dua kolom/pola bintang samar, password reveal, uppercase kode, error inline. Kuis satu soal per layar dengan navigator dan progress; jawaban disimpan di state halaman dan dikirim dengan nama q_<id> yang sama seperti handler asli, bukan autosave server.

Belum sesuai seluruh brief tekstual: peta masih berupa titik, bukan choropleth; detail dua kolom/timeline belum seragam; shell Guru belum memiliki drawer/collapse seperti Admin. Ringkasan Tugas menampilkan total tugas yang tersedia, bukan statistik tugas aktif baru. Login modul saat ini untuk akun Guru/Peserta; Admin tetap memakai autentikasi Core, tanpa checkbox Ingat saya yang tidak didukung API. Notifikasi, Google Form, multi-approver, autosave kuis server, serta metrik progres/riwayat yang belum disediakan tidak disimulasikan. Memenuhi bagian-bagian ini memerlukan pekerjaan UI lanjutan dan, untuk fitur baru, perluasan scope backend.

Verifikasi awal: ESLint kedua modul lulus, TypeScript lulus setelah regenerasi route types, dan 12 tes policy yang sudah ada lulus. Beranda publik dan login diuji melalui browser desktop/mobile. Pada tahap awal tampilan panel admin terautentikasi belum diperiksa karena belum ada sesi login.

Verifikasi brief terbaru: lint Tanwir, TypeScript, dan 6 tes policy Tanwir lulus; login desktop diperiksa visual di browser. Ini bukan audit keamanan menyeluruh maupun tes end-to-end seluruh peran. Font menggunakan next/font (self-hosted saat build).

## Revisi mengikuti screenshot dan login Core

Screenshot Peserta dari pengguna menjadi acuan terbaru: canvas krem #F2F1EB, sidebar 240px, topbar ringkas 56px, kartu statistik putih dengan ikon kecil, avatar/inisial, kode akun, badge kelompok, toolbar filter, aksi edit/hapus ikon, serta footer paginasi. Pola ini diterapkan ke Dashboard, Guru, Peserta, Kelompok, Monitor tugas, Anak didik, dan form melalui komponen bersama. Menu aktif tidak bergeser. Garis hanya samar pada tabel/input. Tabel daftar admin menjadi kartu berlabel di layar mobile. Pencarian/filter/paginasi hanya memproses data yang sudah diotorisasi; guard dan Server Actions tetap sama. Tombol hapus tetap memiliki tahap konfirmasi. Tidak ada kontrol notifikasi/bulk checkbox palsu.

Login Tanwir/Ojol kini menggunakan ProgramLoginShell bersama: identitas program tanpa navigasi landing page, panel form kiri, informasi program kanan, satu panel di mobile. Tanwir tetap terang krem-putih, Ojol hijau gelap. Login Kode Akun, endpoint modul, redirect peran, dan password reveal tetap dipertahankan. Login Core tidak diubah.

Verifikasi terbaru: login admin lokal dilakukan dengan otorisasi pengguna, lalu halaman Peserta, form tambah peserta, Kelompok, Monitor tugas, Anak didik, dan Dashboard diperiksa melalui browser. Pencarian peserta/filter Nonaktif dan drawer mobile berhasil. Tidak menyimpan atau menghapus data saat QA. Kedua login diperiksa desktop/mobile, tombol password reveal Tanwir berfungsi. Lint kedua modul + komponen auth, TypeScript, parsing CSS, diff-check, dan 12 tes policy lulus. QA visual panel Guru/Peserta terautentikasi dan pengiriman form end-to-end belum dilakukan; ini bukan audit keamanan penuh. Peta membutuhkan akses penyedia tile eksternal.

## Ojol mengikuti pola Tanwir, dominan hijau

Ojol memakai struktur Tanwir dengan identitas hijau segar yang terinspirasi layanan ojol: primary #008333 (lebih gelap untuk teks putih), canvas #EEF7F0, menu aktif #D9F7E1. Sidebar dan kartu statistik utama hijau; konten/form tetap putih agar nyaman dibaca. Newsreader dan Plus Jakarta Sans dipakai konsisten. Dashboard, direktori Guru/Peserta, Kelompok, Monitor tugas, form, shell Guru/Peserta, halaman publik, dan login memakai tema ini; tidak ada glow atau pergeseran menu saat hover.

Pencarian/filter/paginasi direktori dan aksi ikon mengikuti UI Tanwir, tetapi tetap memakai guard, Server Actions, dan data Ojol. Tidak menyalin relasi PIC Tanwir atau fitur anak didik; kelompok Ojol tetap berbasis wilayah/basecamp. Form tetap menyimpan nama field yang sama. Pemeriksaan browser mencakup direktori Peserta, filter Nonaktif, Kelompok, form tambah peserta, dan tampilan/drawer mobile. Tidak menyimpan/menghapus data saat pemeriksaan. Lint, TypeScript, parsing CSS, diff-check, dan 12 tes policy Ojol/Tanwir lulus; belum merupakan tes end-to-end semua peran.

Penyempurnaan komposisi: kartu login desktop memakai dua kolom identik 416px, tinggi satu grid row, title block sejajar, dan bantuan akun di bawah. Pengukuran browser: kedua kartu Ojol 416 × 577px; kedua kartu Tanwir 416 × 557px pada viewport pengujian. Tanwir memakai panel form putih dan panel informasi sage; Ojol memakai form putih, informasi hijau, dan canvas hijau gelap. Statistik admin diberi variasi tonal lembut dan shadow rendah agar tidak flat, tanpa garis/glow tambahan. Tidak mengubah autentikasi atau API.
