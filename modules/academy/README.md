# Zakat Academy

Port fitur publik dari `djofan/zakat_academy`, referensi commit
`ac9de275c56ba94f6c79999e98b826e420b1bbe3`.
Modul memakai datasource **MySQL** Core, Prisma Client bersama, dan sesi Core.

## Status

- Schema dan registrasi seed tersedia.
- Halaman publik dan peserta selesai dan telah di-merge ke main.
- Migrasi MySQL dan seed sudah dijalankan oleh pengelola (konfirmasi pengguna).
  Namun pemeriksaan database lokal dari `.env` menemukan registrasi Core
  `Module.slug = "academy"` belum tersedia. Registrasi permanen perlu diperiksa
  sebelum pemakaian; pengujian tidak menjalankan seed.
- Tahap 2 admin: implementasi ringkasan, CRUD program/bab/materi, lampiran berbasis
  URL, publikasi, pencarian/paginasi program, dan urutan manual tersedia.
- Verifikasi tahap 2: 12 tes unit, ESLint, TypeScript, dan build produksi lulus.
  Uji integrasi CRUD MySQL lulus: program/bab/materi/lampiran, urutan, validasi
  induk, dan penolakan penghapusan konten yang memiliki peserta.
  Uji HTTP delapan halaman admin lulus untuk akun berizin; pengunjung, akun
  tanpa izin academy, admin modul lain, role viewer, akun nonaktif, dan sesi
  lama setelah akses dicabut ditolak. Fixture akun/konten/registrasi sementara
  telah dibersihkan. Review visual/interaksi browser oleh pengelola masih diperlukan.
- Tahap 3 admin tersedia: daftar/pencarian/paginasi kuis, CRUD kuis pada bab,
  pertanyaan dan opsi jawaban, urutan pertanyaan, publikasi/aktivasi, jadwal WIB,
  nilai lulus, durasi, serta izin mengulang. Menunggu review pengelola.
- Verifikasi tahap 3: 15 tes unit, 2 tes integrasi MySQL, dan 2 tes HTTP lulus.
  ESLint, TypeScript, dan build produksi juga lulus.
  Sebelas halaman admin telah diuji. Snapshot percobaan tetap utuh setelah
  pengeditan/penghapusan soal; percobaan lama dan baru memakai versi kunci yang
  tepat. Respons peserta tidak membocorkan kunci sebelum selesai atau hasil
  milik peserta lain. Fixture dibersihkan setelah pengujian.
- Tahap 4 (peserta/progres, completion record/sertifikat, pengaturan) belum
  dikerjakan; menunggu review dan persetujuan tahap kuis.

## Rute

| Rute | Akses |
| --- | --- |
| `/academy` | Beranda publik |
| `/academy/program` | Katalog dan pencarian publik |
| `/academy/program/[slug]` | Kurikulum publik; pendaftaran bagi pengguna login |
| `/academy/masuk`, `/academy/daftar` | Login Core dan pendaftaran akun peserta |
| `/academy/belajar`, `/academy/progres` | Dashboard dan progres milik peserta |
| `/academy/program/[slug]/[lessonSlug]` | Video dan lampiran, wajib enrollment |
| `/academy/kuis` | Kuis program yang diikuti |
| `/academy/kuis/[quizId]` | Jadwal, mulai kuis, riwayat percobaan |
| `/academy/kuis/[quizId]/percobaan/[attemptId]` | Kuis dengan timer dan simpan jawaban |
| `/academy/kuis/[quizId]/hasil/[attemptId]` | Hasil dan pembahasan milik peserta |
| `/academy/peringkat` | Peringkat peserta, wajib login |
| `/academy/sertifikat`, `/academy/sertifikat/[courseId]` | Kelulusan dan cetak sertifikat milik peserta |
| `/academy/pemeliharaan` | Modul nonaktif atau maintenance |
| `/admin/academy` | Ringkasan admin |
| `/admin/academy/program` | Daftar, pencarian, filter, paginasi program |
| `/admin/academy/program/baru`, `/admin/academy/program/[courseId]` | Tambah/edit/hapus program; susunan bab |
| `/admin/academy/program/[courseId]/bab/baru`, `.../bab/[chapterId]` | Tambah/edit/hapus bab; susunan materi |
| `.../bab/[chapterId]/materi/baru`, `.../materi/[lessonId]` | Tambah/edit/hapus materi dan lampiran |
| `/admin/academy/kuis` | Daftar, pencarian, paginasi kuis lintas program |
| `.../bab/[chapterId]/kuis/baru`, `.../kuis/[quizId]` | Tambah/edit/hapus kuis, pertanyaan, opsi, urutan dan kunci jawaban |

File `app/(public)/academy` hanya jembatan ke `pages/`.
File `app/admin/academy` hanya jembatan ke `admin/pages/`.
Mutasi memakai Server Actions di `api/actions.ts`; tidak ada backend terpisah.

## Aturan penting

- Setiap halaman admin, layout, dan Server Action admin memanggil
  `requireAcademyAdmin()` sebelum membaca/mengubah konten. Guard membaca akun
  aktif serta `ModuleAccess` academy dengan role `admin` terbaru dari database;
  superadmin aktif mengikuti pengecualian Core. Sesi yang masih mencantumkan
  academy tidak cukup bila akses database telah dicabut. Maintenance publik
  tidak memblokir akses pengelola.
- ID bab/materi/lampiran harus cocok dengan seluruh induk pada URL.
  Penghapusan program/bab/materi ditolak jika program sudah memiliki enrollment;
  FK Restrict juga melindungi riwayat progres, percobaan kuis, dan completion.
  Gunakan status draft untuk menarik konten yang sudah digunakan peserta.
- Urutan memakai angka manual: angka lebih kecil tampil lebih awal.
  Lampiran memakai URL/path; penghapusan lampiran tidak menghapus file sumber.
  Tahap kurikulum tidak membaca/mengubah snapshot jawaban kuis.

- Akun baru dibuat pada `User` Core, dengan email wajib. Pendaftaran tidak membuat
  `ModuleAccess`, sehingga tidak memberikan izin admin. Profil academy bukan akun
  login terpisah. Akun SIP yang sudah ada bisa mendapat profil saat mengikuti program.
- Setiap halaman peserta dan mutasi memeriksa akun aktif, status modul, dan
  maintenance. Materi serta kuis mensyaratkan enrollment dan publikasi induknya.
- URL video hanya di-embed dari provider yang didukung. Materi dan lampiran tidak
  diambil oleh query kurikulum publik.
- `QuizAttempt.answers` berisi snapshot `{ questions, responses, passingScore,
  timeLimitMinutes }`. Kunci jawaban hanya tersedia di server sampai percobaan selesai.
  Snapshot tidak boleh diganti saat admin mengedit kuis.
- Editor admin hanya mengambil soal/opsi kuis saat ini dan jumlah percobaan;
  tidak membaca atau mengirim `QuizAttempt.answers`. Kunci kuis saat ini hanya
  dikirim ke editor setelah guard admin. Soal beserta perubahan opsinya disimpan
  atomik dalam transaksi serializable, tanpa memperbarui percobaan peserta.
- Kuis baru disimpan sebagai draft. Publikasi memerlukan minimal satu pertanyaan,
  2–10 opsi per pertanyaan, dan tepat satu jawaban benar. Nilai lulus 0–100,
  durasi 1–1440 menit. Jadwal input eksplisit WIB (UTC+7), disimpan sebagai UTC.
  Jadwal kosong berarti dapat dikerjakan segera setelah publikasi dan aktivasi.
- Pertanyaan terakhir kuis terpublikasi tidak dapat dihapus. Kuis dengan
  percobaan tidak dapat dihapus; tarik publikasinya bila diperlukan.
  Perubahan soal, nilai lulus, dan durasi berlaku untuk percobaan baru.
  Menonaktifkan kuis menghentikan pengerjaan sementara; menarik publikasi juga
  menutup akses halaman kuis bagi peserta sesuai aturan akses publik.
- Percobaan memakai transaksi serializable dan nomor percobaan unik. Deadline
  dihitung dari waktu mulai server; jawaban yang tiba setelah deadline tidak diterima.
  Percobaan kedaluwarsa diselesaikan saat dibuka kembali atau saat ada mutasi berikutnya.
- Peringkat memakai rata-rata nilai terbaik per kuis, bukan jumlah percobaan.
- Sertifikat mensyaratkan minimal satu materi, semua materi terpublikasi selesai,
  dan seluruh kuis terpublikasi lulus. Kelayakan dihitung ulang agar perubahan
  kurikulum/progres tidak meninggalkan status kelulusan usang. Tanggal cetak memakai
  tanggal penyelesaian yang dihitung dari progres dan hasil, bukan tanggal hari ini.
- URL sertifikat dari pengelola berada di `CompletionRecord.certificateUrl` per course.
  `legacyCertificateUrl` disimpan untuk penanganan data lama, bukan ditampilkan otomatis
  sebagai sertifikat semua program.
- Tidak ada checkout premium. Jika ditambahkan, transaksi wajib melalui modul
  payment dan callback `registerConfirmationHandler("academy", ...)` yang idempoten.

## Verifikasi

```sh
npx tsx --test modules/academy/api/policy.test.ts modules/academy/api/admin-validation.test.ts modules/academy/api/admin-quiz-validation.test.ts
npx eslint modules/academy "app/(public)/academy" app/admin/academy
npx next typegen
npx tsc --noEmit --incremental false
```

Uji integrasi menggunakan fixture sementara, hanya pada database MySQL lokal
non-production; fixture dibersihkan berdasarkan ID yang dibuat pengujian:

```powershell
$env:ACADEMY_MYSQL_TEST="1"
node --conditions=react-server --import tsx --test modules/academy/api/admin-curriculum.integration.test.ts modules/academy/api/admin-quizzes.integration.test.ts
Remove-Item Env:ACADEMY_MYSQL_TEST
```

Uji akses HTTP memerlukan server Next lokal berjalan (default port 3002).
Tes membuat akun/konten sementara dan registrasi modul sementara jika belum ada,
kemudian membersihkan hanya fixture miliknya. Tidak menjalankan seed permanen.

```powershell
$env:ACADEMY_HTTP_TEST="1"
$env:ACADEMY_TEST_URL="http://127.0.0.1:3002"
node --conditions=react-server --import tsx --test modules/academy/api/admin-access.integration.test.ts
Remove-Item Env:ACADEMY_HTTP_TEST, Env:ACADEMY_TEST_URL
```

Setelah MySQL aktif dan tersedianya konten uji melalui admin, periksa:

1. Pengunjung hanya melihat course/chapter/lesson yang terpublikasi.
2. Registrasi, login Core, enrollment, video, lampiran, dan progres tersimpan.
3. Peserta kedua tidak bisa membaca atau mengubah percobaan/sertifikat peserta pertama.
4. Kuis belum terjadwal/nonaktif ditolak; reload tidak mereset waktu; jawaban terlambat
   ditolak; pengiriman ganda tidak membuat nilai atau percobaan ganda.
5. `allowRetake` membuat percobaan baru tanpa mengubah riwayat sebelumnya.
6. Belum lulus kuis atau belum selesai materi tidak bisa membuka sertifikat langsung.
7. Menonaktifkan akun/modul atau mengaktifkan maintenance memblokir mutasi peserta.
8. Tampilan mobile, navigasi keyboard, serta cetak sertifikat A4 landscape.
9. Admin modul lain, peserta, akun nonaktif, dan akses academy yang dicabut
   tidak bisa membuka halaman atau mengirim mutasi admin academy.
10. Tambah/edit/hapus program → bab → materi → lampiran; ubah urutan, publikasi,
    slug duplikat, serta tolak ID induk yang salah. Program dengan peserta tidak
    dapat dihapus beserta turunannya.
11. Dari halaman bab, simpan kuis draft, tambahkan pertanyaan/opsi, lalu publikasi
    dan aktifkan. Periksa input jadwal WIB, urutan, serta pesan validasi.
12. Mulai kuis sebagai peserta, edit soal/kunci/durasi sebagai admin, lalu
    selesaikan percobaan lama. Soal dan nilainya harus mengikuti snapshot awal.
    Percobaan berikutnya memakai perubahan baru.
