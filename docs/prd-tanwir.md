# PRD — Modul Tanwir Qurani

> Status: **sedang dikerjakan** (Fase 5). Dokumen ini disusun dari pembedahan kode aplikasi lama
> `djofan/tanwir-qurani` (Laravel 12 + Filament) dan keputusan tim per 7 Oktober 2026.
> Semua aturan bisnis di §6 diambil dari perilaku aplikasi lama — jangan diubah tanpa diskusi.

## 1. Ringkasan

Tanwir Qurani adalah program pembinaan Qur'an LAZ SIP untuk **guru ngaji TPQ** yang tersebar di banyak
lokasi. Peserta menyetor hafalan (suara/video) dan mengerjakan kuis secara daring; guru pembimbing (PIC)
meninjau setoran, memberi catatan, dan memantau progres kelompok yang diampu. Peserta juga mencatat data
santri (anak didik) yang mereka ajar di TPQ masing-masing.

Modul ini membangun ulang seluruh fitur aplikasi lama sebagai modul native di platform, dengan tampilan
baru yang **elegan, bersih, minimalis, dan modern**.

## 2. Peran

| Peran | Siapa | Tempat kerja di platform |
|---|---|---|
| **Admin Tanwir** | Pengelola program LAZ SIP | `/admin/tanwir` (shell Core Panel) |
| **Guru (PIC)** | Pembimbing yang lebih berilmu, menaungi ≥1 kelompok | `/tanwir/guru` (app modul, ramah HP) |
| **Peserta** | Guru ngaji di TPQ — menyetor hafalan pribadi & mencatat santri | `/tanwir/peserta` (app modul, ramah HP) |
| Pengunjung | Publik | `/tanwir` (situs publik) |

> Catatan koreksi: PRD induk versi awal menyebut peserta = anak didik. Itu keliru. **Peserta adalah
> guru ngaji**, sedangkan **anak didik** adalah data santri yang dicatat peserta (bukan akun login).

## 3. Autentikasi & Akses (wajib ikut Core — CLAUDE.md §3)

- Guru dan peserta adalah **akun Core** (`users`) + profil modul `TanwirMember` (kode akun, peran, data diri).
  Tidak ada tabel user/sesi terpisah.
- **Login pakai kode akun + password** di `/tanwir/masuk` (seperti aplikasi lama). Server mencari
  `TanwirMember.code`, memverifikasi password akun Core, lalu menerbitkan **sesi Core yang sama**
  (`sip_session`). Akun/peserta nonaktif ditolak dengan pesan "Akun ini nonaktif. Hubungi admin."
- Email opsional. Bila kosong, akun Core memakai alamat placeholder `<kode>@tanwir.invalid`
  (TLD `.invalid` tidak pernah bisa menerima email).
- Kode akun dibuat otomatis & unik: guru `GTQ001`, peserta `PTQ001`, kelompok `TQ001` (urut, lompati
  kode yang sudah terpakai). Kode tidak bisa diubah setelah dibuat.
- Guru & peserta **tidak** diberi `module_access` → tidak bisa membuka `/admin/tanwir`.
  Admin Tanwir = akun Core dengan akses modul `tanwir` (diatur lewat Kelola Akun) atau superadmin.
- Password hanya bisa direset admin. Pengguna bisa mengganti password sendiri di halaman Profil.
- Modul nonaktif: situs publik & app 404 untuk umum, tetap bisa dibuka superadmin untuk pengujian.

## 4. Arah Desain

- Elegan, bersih, minimalis, modern. Tanpa ornamen dekoratif (watermark, motif, garis hias), tanpa gaya
  "template AI" (gradien ungu-biru, glassmorphism, emoji di label, bayangan berlebihan).
- Palet: latar gading `#F7F5EF`, tinta `#16211D`, aksen hijau tua `#1F4D43`, emas redup `#A8803A`
  hanya untuk penekanan kecil. Status: hijau = disetujui, kuning = menunggu, merah = ditolak/terlambat.
- Tipografi: Geist untuk UI; judul situs publik boleh memakai serif display (satu keluarga saja).
- App guru/peserta dirancang **mobile-first** (mayoritas pengguna memakai HP): navigasi bawah di HP,
  sidebar di desktop, tombol aksi utama besar dan jelas.
- Ikon fungsional saja (garis tipis, konsisten satu set).

## 5. Fitur

### 5.1 Situs publik (`/tanwir`)
Beranda, Tentang, Program & Fitur, FAQ, Kontak — konten mengikuti aplikasi lama (lihat repo lama
`resources/views/*.blade.php`), tanpa angka klaim yang tidak bisa diverifikasi. Tombol utama "Masuk
dengan Kode Akun" dan "Hubungi Admin" (WhatsApp, nomor dari env `NEXT_PUBLIC_TANWIR_WHATSAPP`).

### 5.2 Peserta (`/tanwir/peserta`)
- **Beranda**: sapaan, kelompok & guru PIC, info kelompok (deskripsi kelompok), ringkasan
  Belum dikerjakan / Menunggu koreksi / Harus diulang / Selesai, tugas terdekat tenggatnya.
- **Tugas**: daftar tugas kelompoknya dengan status per tugas (belum, menunggu, ditolak, disetujui,
  terkunci) + filter. Peserta tanpa kelompok tidak melihat tugas apa pun.
- **Kerjakan setoran** (voice note / video): rekam langsung dari browser (MediaRecorder) atau unggah file.
  Pratinjau sebelum kirim.
- **Kerjakan kuis**: semua soal wajib dijawab, nilai langsung keluar.
- **Detail tugas**: status, nilai, riwayat koreksi + catatan guru, jawaban kuis (benar/salah).
- **Anak Didik**: CRUD santri miliknya (nama, usia, kelas, nama & HP orang tua/wali, progres belajar/hafalan).
- **Profil**: lihat & ubah data diri (HP, jenis kelamin, foto, tempat mengajar/TPQ, alamat berjenjang),
  ganti password.

### 5.3 Guru (`/tanwir/guru`)
- **Beranda**: jumlah setoran menunggu koreksi (ditonjolkan bila > 0), jumlah tugas dibuat,
  daftar peserta di kelompok yang diampu.
- **Tugas**: daftar tugas buatannya; buat/ubah/hapus tugas; perpanjang tenggat tugas terkunci;
  lihat hasil per tugas.
- **Form tugas**: judul, tipe (Voice Note / Video / Kuis), deskripsi/perintah, tenggat (wajib, ≥ sekarang).
  Tipe kuis menampilkan pembuat soal: pertanyaan, pilihan A–D, kunci jawaban, urutan (bisa diurutkan ulang),
  minimal 1 soal.
- **Antrean koreksi**: setoran `pending` dari tugas buatannya (bukan kuis). Review: pemutar audio/video,
  info peserta, percobaan ke-, riwayat koreksi. Aksi **Setujui** (konfirmasi) atau **Tolak** (alasan wajib).
- **Hasil tugas**: tabel peserta, status, percobaan, tepat waktu/terlambat, waktu kumpul, riwayat.
- **Hasil kuis**: tabel peserta, nilai (≥70 hijau, 50–69 kuning, <50 merah), benar/total, ketepatan,
  lihat jawaban per soal.
- **Anak Didik**: lihat & kelola santri milik peserta di kelompok yang diampu.
- **Profil**: seperti peserta (tanpa kelompok).

### 5.4 Admin (`/admin/tanwir`)
- **Dashboard**: jumlah guru, peserta, tugas, setoran menunggu; **peta sebaran** guru & peserta;
  pengguna terbaru.
- **Guru**: CRUD akun guru (nama, email opsional, password, status aktif, HP, gender, alamat berjenjang),
  kolom kelompok yang diampu & jumlah tugas. Kode tampil setelah dibuat.
- **Peserta**: CRUD akun peserta (+ kelompok, tempat mengajar/TPQ, foto), jumlah setoran.
- **Kelompok**: CRUD (nama, deskripsi, **PIC guru wajib**), jumlah anggota & tugas terkirim, daftar anggota.
- **Monitor Tugas**: semua tugas lintas guru, filter tipe & "ada yang menunggu", jumlah setoran &
  menunggu, tombol **Ingatkan via WhatsApp** ke guru pembuat (muncul hanya bila guru punya nomor HP
  dan ada setoran menunggu), hapus tugas.
- **Anak Didik**: daftar seluruh santri lintas peserta (baca + kelola).

## 6. Aturan Bisnis (jangan dilanggar)

1. **Tugas dikirim ke kelompok yang di-PIC-i guru pembuatnya**, otomatis saat dibuat & disinkron ulang
   saat diubah. Guru tanpa kelompok tetap bisa membuat tugas, tetapi tugas itu tidak terlihat peserta.
2. **Tenggat wajib.** `originalDeadline` dicatat saat tugas dibuat. Tugas **terkunci** saat
   `sekarang > deadline` — peserta tidak bisa mengerjakan/mengumpulkan. *Penyesuaian dari aplikasi lama:*
   selama **belum ada yang mengumpulkan**, mengubah tenggat lewat form ikut menggeser `originalDeadline`
   (di aplikasi lama hal ini membuat semua pengumpulan tercatat terlambat). Setelah ada pengumpulan,
   tenggat hanya bisa digeser lewat **Perpanjang**, dan soal kuis serta tipe tugas dikunci.
3. **Perpanjang tenggat**: hanya guru pembuat, hanya saat tugas terkunci, 1–72 jam dihitung dari
   **sekarang** (`deadline = now + jam`). `originalDeadline` tidak berubah.
4. **Terlambat**: pengumpulan saat `sekarang > originalDeadline` ditandai `isLate = true`
   (termasuk pengumpulan di masa perpanjangan).
5. **Satu submission per peserta per tugas.** Setoran baru → `pending`, percobaan 1. Peserta tidak bisa
   mengirim lagi saat status `pending` atau `approved`.
6. **Ditolak → kirim ulang**: submission yang sama diperbarui, file lama dihapus, status kembali
   `pending`, `attemptsCount + 1`.
7. **Koreksi** hanya oleh guru pembuat tugas. Setujui → `approved`, log "Tugas disetujui.". Tolak →
   `rejected`, **alasan wajib**. Setiap koreksi menulis `TanwirSubmissionLog` (status, catatan, peninjau,
   nomor percobaan). Kuis tidak pernah masuk antrean koreksi.
8. **Kuis**: dikerjakan **sekali**, semua soal wajib dijawab, langsung `approved`, nilai =
   `round(benar / total × 100)`, setiap jawaban tersimpan dengan flag benar/salah.
9. **Visibilitas tugas**: peserta hanya melihat tugas yang terkirim ke kelompoknya.
10. **Batas file setoran**: audio (mp3/wav/webm/ogg/m4a) & video (mp4/webm/mov) maksimal **50 MB**,
    divalidasi dari isi file (magic bytes), bukan hanya ekstensi.
11. **Privasi**: data anak didik (nama, usia, kontak orang tua) dan alamat/HP guru & peserta **tidak boleh**
    muncul di endpoint/halaman publik. File setoran **privat** — hanya peserta pemilik, guru pembuat tugas,
    dan admin Tanwir yang bisa memutar.
12. **Lingkup data guru**: guru hanya melihat peserta & anak didik di kelompok yang ia PIC-i, dan hanya
    mengoreksi tugas buatannya.
13. Menonaktifkan akun = tidak bisa login, data tetap tersimpan. Menghapus guru tidak menghapus tugasnya
    (pembuat menjadi kosong) maupun riwayat koreksi.

## 7. Skema Data (`modules/tanwir/schema.prisma`)

| Model (tabel) | Isi pokok |
|---|---|
| `TanwirMember` (`tanwir_members`) | `userId` (unik → `users`), `code` unik, `role` guru/peserta, HP, gender, foto, tempat mengajar, alamat + provinsi/kota/kecamatan/kelurahan (id & nama), lat/lng, `groupId` (peserta) |
| `TanwirGroup` (`tanwir_groups`) | `code` unik, nama, deskripsi, `picId` → guru |
| `TanwirTask` (`tanwir_tasks`) | `teacherId` → guru (SetNull), judul, deskripsi, `type`, `deadline`, `originalDeadline` |
| `TanwirTaskGroup` (`tanwir_task_groups`) | pivot tugas ↔ kelompok |
| `TanwirQuizQuestion` (`tanwir_quiz_questions`) | pertanyaan, opsi A–D, kunci, urutan |
| `TanwirSubmission` (`tanwir_submissions`) | tugas, peserta, file + mime, status, percobaan, nilai, `isLate`, unik (tugas, peserta) |
| `TanwirSubmissionLog` (`tanwir_submission_logs`) | status saat itu, catatan, peninjau, nomor percobaan |
| `TanwirQuizAnswer` (`tanwir_quiz_answers`) | jawaban per soal + benar/salah |
| `TanwirStudent` (`tanwir_students`) | anak didik milik peserta: nama, usia, kelas, orang tua & HP, progres |

Relasi ke Core hanya lewat `TanwirMember.userId → users.id`. Tidak mereferensi tabel modul lain.

## 8. File & Layanan Luar

- **Setoran** disimpan di luar folder publik (`.tanwir-uploads/`, bisa diubah lewat `TANWIR_UPLOAD_DIR`),
  diputar lewat endpoint yang memeriksa hak akses dan mendukung HTTP Range. Direktori ini wajib ikut
  backup dan memakai volume persisten saat deploy.
- **Foto profil** disimpan di direktori yang sama, diakses lewat endpoint berizin (bukan publik). Foto
  dikecilkan di browser (sisi terpanjang 512 px, WebP) sebelum diunggah.
- **Wilayah berjenjang**: API publik emsifa, dipanggil dari server dan di-cache; bila API gagal,
  isian alamat tetap bisa diketik manual.
- **Geocoding**: Nominatim (OpenStreetMap), dijalankan di server setelah alamat tersimpan, berjenjang
  kelurahan → kecamatan → kota → provinsi, hasil disimpan ke `latitude/longitude`. Kegagalan tidak
  menggagalkan penyimpanan.
- **Peta**: MapLibre GL + tile vektor **OpenFreeMap** gaya Positron (gratis, tanpa API key, tanpa batas;
  terang & minimalis), atribusi tampil otomatis. CARTO tidak dipakai karena kini mewajibkan API key.
- **WhatsApp**: hanya tautan `wa.me` dengan pesan terisi; tidak ada pengiriman otomatis.

## 9. Kebutuhan Non-Fungsional

- Semua halaman app nyaman di layar 360 px; perekaman berjalan di Chrome Android & Safari iOS terbaru.
- Unggahan besar memakai route handler (bukan server action) dan streaming ke disk.
- Query halaman publik tidak pernah memilih field privat (CLAUDE.md §5).
- Logika murni (status tugas, terlambat, nilai kuis, format kode) punya unit test.

## 10. Data Lama

**Keputusan 7 Oktober 2026: mulai dari nol — data aplikasi lama tidak dimigrasi.** Admin membuat ulang akun
guru, peserta, dan kelompok di platform baru. Repo lama hanya dipakai sebagai referensi fitur & alur.

## 11. Di Luar Lingkup (sengaja tidak dibawa)

- Kuis via Google Form + bukti screenshot (sudah digantikan kuis native di aplikasi lama).
- Co-reviewer/approver tambahan (itu fitur Ojol Mengaji, bukan Tanwir).
- Pendaftaran mandiri — semua akun dibuat admin.

## 12. Definition of Done

Status 7 Oktober 2026: semua butir di bawah sudah dibangun dan diuji (`npm run test:tanwir` + uji manual di browser,
lihat `docs/tanwir-demo.md`). Tersisa: uji perekaman langsung di HP sungguhan.


- [x] Admin bisa membuat guru, peserta, kelompok (dengan PIC) — kode akun terbit otomatis.
- [x] Guru & peserta login dengan kode akun, mendapat sesi Core, diarahkan ke app sesuai peran.
- [x] Alur penuh: guru buat tugas → peserta rekam/unggah → guru tolak (catatan) → peserta kirim ulang
      (percobaan 2) → guru setujui; riwayat koreksi lengkap.
- [x] Kuis: buat soal → peserta kerjakan → nilai otomatis; guru lihat hasil & jawaban.
- [x] Tenggat: terkunci setelah lewat, perpanjang oleh pembuat, pengumpulan di masa perpanjangan tercatat terlambat.
- [x] Anak didik: peserta kelola miliknya, guru melihat milik kelompoknya, admin melihat semua.
- [x] Dashboard admin dengan peta sebaran; pengingat WhatsApp ke guru.
- [x] File setoran tidak bisa dibuka tanpa hak akses; data privat tidak muncul di halaman publik.
- [x] Unit test logika inti lulus; typecheck & lint bersih.
