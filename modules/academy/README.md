# Zakat Academy

Port fitur publik dari `djofan/zakat_academy`, referensi commit
`ac9de275c56ba94f6c79999e98b826e420b1bbe3`.
Modul memakai datasource **MySQL** Core, Prisma Client bersama, dan sesi Core.

## Status

- Schema dan registrasi seed tersedia.
- Halaman publik dan peserta telah diport; admin menunggu review tahap publik.
- Generate client sudah diizinkan untuk validasi kode.
- Migrasi dan seed belum dijalankan; uji integrasi MySQL dilakukan setelah migrasi.

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

File `app/(public)/academy` hanya jembatan ke `pages/`.
Mutasi memakai Server Actions di `api/actions.ts`; tidak ada backend terpisah.

## Aturan penting

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
npx tsx --test modules/academy/api/policy.test.ts
npx eslint modules/academy "app/(public)/academy"
npx next typegen
npx tsc --noEmit --incremental false
```

Setelah migrasi, seed registry, dan tersedianya konten uji melalui admin, periksa:

1. Pengunjung hanya melihat course/chapter/lesson yang terpublikasi.
2. Registrasi, login Core, enrollment, video, lampiran, dan progres tersimpan.
3. Peserta kedua tidak bisa membaca atau mengubah percobaan/sertifikat peserta pertama.
4. Kuis belum terjadwal/nonaktif ditolak; reload tidak mereset waktu; jawaban terlambat
   ditolak; pengiriman ganda tidak membuat nilai atau percobaan ganda.
5. `allowRetake` membuat percobaan baru tanpa mengubah riwayat sebelumnya.
6. Belum lulus kuis atau belum selesai materi tidak bisa membuka sertifikat langsung.
7. Menonaktifkan akun/modul atau mengaktifkan maintenance memblokir mutasi peserta.
8. Tampilan mobile, navigasi keyboard, serta cetak sertifikat A4 landscape.
