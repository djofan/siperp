# Insan Academy — operasional angkatan pertama

## Pengembangan lanjutan

- Pengajar mengunggah audio MP3/WAV/OGG/M4A (maksimal 50 MB) dan PDF (maksimal
  10 MB) di menu Materi. Simpan materi baru terlebih dahulu agar tersedia tombol
  upload. Audio menjadi sumber pemutar, PDF menjadi lampiran. File berada di
  `.academy-uploads` (atau direktori `ACADEMY_UPLOAD_DIR`), di luar direktori publik; endpoint memeriksa akun, enrollment,
  publikasi dan hari rilis. Pemutar mendukung HTTP Range. Direktori ini harus
  disertakan dalam backup dan memakai volume persisten ketika aplikasi di-deploy.
- Posisi audio disimpan per peserta/materi di database tiap sekitar 10 detik,
  ketika dijeda, dan saat meninggalkan halaman. Audio yang telah selesai dimulai
  ulang; penggantian sumber audio tidak memakai posisi sumber lama. Posisi audio
  tidak otomatis menyelesaikan materi atau menentukan kelulusan.
- Menu Pengingat Ujian dan dashboard menampilkan ujian yang dibuka dalam 7 hari,
  ujian tersedia, tenggat kurang dari 24 jam, dan ujian terlewat dalam 7 hari
  terakhir. Ujian yang telah dikerjakan tidak lagi mengingatkan peserta. Status
  dibaca disimpan per akun. Pengingat diperbarui tiap menit saat halaman terlihat;
  ini notifikasi dalam aplikasi, tanpa pengiriman WhatsApp/email.
- Pengajar mengisi kolom pembahasan per soal. Peserta tetap melihat skor setelah
  mengumpulkan ujian, tetapi kunci jawaban dan penjelasan hanya dirender setelah
  batas tutup. Tetapkan batas tutup di form ujian; tanpa batas tersebut pembahasan
  tetap terkunci. Snapshot percobaan menjaga kunci dan pembahasan saat pengerjaan.
- Dashboard pengajar dan menu Nilai menampilkan peserta yang melewatkan tenggat,
  mendapat nilai terbaik di bawah batas lulus, atau belum mengerjakan ujian yang
  sudah tersedia. Ujian yang belum dibuka tidak menjadi alasan tindak lanjut.
- Superadmin mengelola angkatan di `/admin/academy/angkatan`. Angkatan baru
  menyalin materi, file upload dan soal dari template resmi. Peserta, nilai,
  sertifikat, pertanyaan, tanggal mulai dan jadwal absolut ujian tidak disalin.
  Angkatan/ujian baru dibuat draft, dengan kuota 200 dan durasi 30 hari. Membuka
  pendaftaran angkatan menutup pendaftaran angkatan resmi lainnya secara atomik.
  Jadwal, ranking, nilai dan sertifikat tetap terkait ID angkatan masing-masing.

Verifikasi lokal: `node scripts/check-academy-development.mjs` memakai fixture
sementara dan sesi uji singkat dari akun lokal yang telah memiliki peran tersebut.
Script menghapus fixture dan file ujinya setelah pemeriksaan, tanpa mengganti
password akun atau membuat superadmin baru.

Program memakai satu pemateri, Ustadz Irham, dengan materi audio. Nomor CS awal:
**+62 811-1186-626**. Pendaftaran final memakai web, mengikuti keputusan pengelola
di chat, sehingga tidak memerlukan Google Form.

## Pendaftaran dan grup

1. Peserta membuka `/academy/daftar`, mengisi nama, email, nomor WhatsApp,
   jenis kelamin, dan password. Pendaftaran membuat akun Core, profil, dan
   enrollment secara atomik. Tidak memberikan akses admin atau pengajar.
2. Kuota 200 dihitung dari enrollment angkatan, bukan seluruh akun Core.
   Pendaftaran web dan impor memakai lock program yang sama. Saat penuh atau
   program sudah dimulai, pendaftaran program ditutup.
3. Superadmin membuka `/admin/academy/pendaftaran`, mengunduh kontak VCF,
   mengimpornya ke aplikasi Contacts yang digunakan tim, dan memasukkan peserta
   ke grup WhatsApp secara manual. Tombol status grup hanya mencatat pekerjaan
   tersebut; sistem tidak mengirim pesan atau memasukkan orang ke grup otomatis.
4. Impor CSV opsional tersedia untuk pendaftaran manual. Maksimal 50 baris per
   batch dengan header `name,email,phone,gender`. Gender IKHWAN/AKHWAT. Impor
   tidak mengganti password atau nama akun lama. Password sementara akun baru
   ditampilkan sekali dan wajib diganti sebelum mengakses materi.
5. Setelah kuota terpenuhi dan tim siap, superadmin menetapkan tanggal mulai
   dalam WIB. Program berlangsung **30 hari** sebagai implementasi satu bulan.
   Tanggal mulai program yang sudah berjalan tidak dapat digeser dari form ini.

## Jadwal dan materi

Kerangka awal: 3 pekan dengan 4 slot materi per pekan (12 materi). Minggu ke-4
tidak mempunyai materi baru. Ujian harian 4 kali seminggu selama minggu 1–3
pada hari 1–4, 8–11, dan 15–18 (12 ujian). Ujian
mingguan 3 kali sebulan pada hari 6, 13, dan 20. Setiap bab memiliki ujian akhir
bulan pada hari ke-30 (3 ujian untuk kerangka 3 bab saat ini). Pengajar dapat
mengatur waktu buka, tutup, dan durasi masing-masing ujian.

Audio resmi belum disediakan. Semua 12 slot materi dan 18 evaluasi resmi
disimpan sebagai draft. Judul placeholder harus diganti sesuai silabus yang
disepakati. Pengajar mengisi teks dan/atau URL audio serta publikasi materi di
`/academy/pengajar/materi`. Materi teks saja tidak menampilkan pemutar audio kosong.
Materi tidak terbuka sebelum tanggal mulai atau sebelum hari rilisnya.
Materi yang telah dibuka tetap dapat dipakai untuk murojaah setelah program.

## Dashboard dan peran

Peserta: dashboard, materi, ujian, pertanyaan pribadi, catatan, sertifikat milik
sendiri, peringkat milik sendiri, dan ganti password. Menu Kemajuan Saya dihapus;
URL lamanya mengarah ke dashboard. Peringkat dihitung per program memakai nilai
berbobot, tanpa menampilkan identitas/nilai peserta lain; nilai sama mendapat
peringkat sama. Program simulasi mempunyai kelompok peringkat terpisah.

Pengajar: dashboard ringkas dengan empat fungsi, yaitu materi teks/audio, soal
dan ujian, jawaban pertanyaan, serta nilai seluruh peserta dengan rincian per
ujian. Tidak ada menu sertifikat, peringkat pribadi, atau kemajuan. Halaman dan
server action mengharuskan akses pengajar/superadmin; akun peserta tidak dapat
mengubah materi, soal, atau melihat tabel nilai peserta lain. Pengajar tidak
memperoleh akses pengelolaan akun, kontak, atau pengaturan admin.

Superadmin lama tetap mengelola administrasi, peserta, sertifikat, dan pengaturan.

Evaluasi mempunyai hari rilis 1–30, waktu buka tambahan, batas tutup opsional,
dan durasi pengerjaan. Batas tutup wajib diisi untuk evaluasi resmi yang harus
ditutup pada hari tertentu. Batas tutup dapat memperpendek durasi percobaan;
muat ulang halaman tidak mengulang timer. Soal/kunci/bobot disnapshot saat
percobaan dimulai, sehingga perubahan admin tidak mengubah percobaan lama.

## Penilaian

- Pilihan ganda dan benar/salah: satu jawaban benar.
- Multiple choice: satu atau beberapa jawaban benar dengan minimal satu
  pengecoh. Nilai penuh hanya jika himpunan pilihan persis sesuai kunci.
- Bobot soal 1–100. Salah atau kosong bernilai 0, tanpa pengurangan nilai.
- Nilai kuis = bobot jawaban benar / total bobot soal × 100, dibulatkan dua
  angka desimal. Ambang awal kelulusan kuis 70.
- Nilai program awal = **20% rerata harian + 30% rerata pekanan + 50% ujian
  akhir**. Evaluasi yang belum dikerjakan tetap dihitung 0. Jika retake diizinkan,
  nilai terbaik per kuis digunakan; jumlah percobaan tidak menambah bobot.
- Nilai sementara ditandai sampai semua tiga kategori dan seluruh evaluasi
  terpublikasi selesai. Sertifikat mensyaratkan semua materi selesai, semua
  evaluasi lulus, ketiga kategori tersedia/selesai, dan nilai berbobot ≥70.
- Superadmin bisa mengubah bobot kategori di pengaturan dengan total wajib 100%.
  Perubahan bobot kategori menghitung ulang nilai program; nilai kuis lama tetap.

Bobot 20/30/50 adalah pilihan konfigurasi awal program ini, bukan klaim bobot
resmi HSI. Pola audio dan evaluasi berjenjang mengacu pada
[HSI Reguler](https://home.hsi.id/divisi/reguler). Penggunaan evaluasi rutin dengan
umpan balik dan evaluasi akhir mengikuti pembedaan
[formative/summative assessment CMU](https://www.cmu.edu/teaching/assessment/basics/formative-summative.html).

## Hak akses dan akun simulasi

- Peserta: audio, catatan pribadi, kuis, progres, tanya jawab, dan ganti password.
- Pengajar: daftar rekaman yang belum tersedia, penyimpanan URL audio sebagai
  draft, jadwal sesi, serta jawaban pertanyaan peserta. Tidak mendapat akses
  administrasi Core atau panel admin academy.
- Superadmin yang sudah ada: seluruh administrasi. Tidak dibuat akun admin baru.

`npm run db:setup:insan-academy` menerapkan dua migrasi tambahan khusus academy,
menyiapkan kerangka program, dan membuat akun simulasi peserta/pengajar pada
database lokal. Script tidak menimpa password akun yang sudah ada. Kredensial
tersimpan di `academy-simulation.local.json` (diabaikan Git).

Program simulasi terpisah dari angkatan resmi dan tidak mengurangi kuota resmi.
Audio simulasi hanyalah bunyi uji pemutar tiga detik, **bukan rekaman ustadz**.
Tersedia satu materi dan evaluasi harian/pekanan/akhir dengan ketiga jenis soal.
Script dapat dijalankan ulang tanpa menggandakan akun, materi, atau evaluasi.
