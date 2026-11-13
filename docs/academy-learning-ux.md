# Academy: kemudahan belajar dan pengelolaan

Perubahan lokal November 2026:
- Peserta dapat menandai materi selesai/belum selesai. Daftar memfilter progres sendiri; tombol lanjut mengambil materi belum selesai yang terakhir dikunjungi/diputar. Riwayat kunjungan dikirim melalui POST berizin, bukan saat GET.
- Pencarian/status pada daftar materi, ujian dan tanya jawab, dengan pagination serta tautan kembali yang mempertahankan filter. URL kembali dibatasi ke daftar modul yang sesuai.
- Dashboard memprioritaskan ujian dengan tenggat kurang dari 24 jam. Ini pengingat dalam aplikasi, bukan Web Push/background.
- Form materi, soal, ujian, jawaban dan catatan memperingatkan perubahan belum tersimpan. Peringatan tersedia untuk link keluar, logout, refresh/tutup tab dan status offline. Browser Back/gesture dan pematian paksa aplikasi tetap mengikuti keterbatasan browser; jangan menganggap draft tersimpan.
- Isian/jawaban tidak dicache ke localStorage atau service worker. Ujian dikirim ketika dikumpulkan, waktu tetap berjalan ketika offline. Kegagalan server tidak menampilkan status sukses; formulir tidak direset bila masih memiliki perubahan.
- Pengajar: Nilai Peserta membuka progres per peserta/angkatan (materi selesai, ujian belum dikerjakan, nilai sementara), dengan tab rincian nilai lama. Penghitungan memakai ProgressService dan kebijakan nilai ERP.
- Sesi langsung bisa diedit, dibatalkan atau ditandai selesai setelah waktu mulai. Riwayat tetap ada, tombol bergabung disembunyikan untuk sesi batal/selesai.

## Deployment

Migration tambahan `2026_11_13_000000_add_academy_session_lifecycle` menambah `cancelled_at` dan `ended_at` nullable; tidak mengubah data materi/akun. Sudah dijalankan pada database development lokal. Untuk server publik: review/backup database, terapkan migration melalui prosedur deployment proyek, lalu build dan restart frontend/backend. Commit/push tidak berarti deploy. Tidak ada konfigurasi Firebase baru.

## Kontrak tambahan

- POST `/api/v1/academy/lessons/{lessonId}/visits`: peserta sendiri, materi terpublikasi dan sudah dibuka; menyentuh progres tanpa menghapus status selesai/audio.
- GET `/api/v1/academy/teacher/progress`: pengajar/admin, q/cohort/page; output metadata dan ringkasan progres tanpa kontak/kunci jawaban.
- PUT `/api/v1/academy/teacher/sessions/{id}`: title, startsAt (WIB), joinUrl, status scheduled/completed/cancelled. Autentikasi/otorisasi tetap di Laravel.

Generator `api/tools/export-openapi.mjs` dan kontrak TypeScript Academy diperbarui bersama artifact OpenAPI. Pengujian backend memakai SQLite in-memory; pengujian browser memakai akun dummy lokal.

## Hasil verifikasi lokal

- Regresi backend Academy: 165 tes lulus, 928 assertion, database SQLite in-memory.
- Tes frontend Academy: 30 tes sebelumnya lulus; perlindungan draft/koneksi: 4 tes lulus (34 total).
- ESLint seluruh direktori Academy lulus; artifact OpenAPI tidak drift; `git diff --check` bersih.
- TypeScript seluruh repo masih gagal karena dependency lokal `exifr`, `firebase/app`, `firebase/messaging` di Bantuan belum terpasang dan tipe turunannya. Tidak ada error Academy dalam hasil pemeriksaan tersebut. Build penuh belum dinyatakan lulus.
- Browser lokal: login pengajar/peserta, daftar/filter progres, formulir dan daftar sesi, status materi, serta viewport 390/1280 piksel. Pengujian install/native popup di perangkat fisik belum dilakukan dalam perubahan ini.
