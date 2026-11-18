# Progres Peserta untuk admin Academy

Implementasi lokal 18 November 2026. Tidak menjalankan migration atau mengubah akun
pada database pengguna/VPS.

## Menu dan akses

Menu baru **Progres Peserta** tersedia di sidebar dan pintasan dashboard admin.
Daftar Peserta juga memiliki tombol Progres. Route:

- `/admin/academy/progres`: pilih angkatan, cari nama/NIP, filter Ikhwan/Akhwat,
  dan lihat rekap 25 peserta per halaman.
- `/admin/academy/progres/{profileId}?cohort=...`: rincian setiap ujian peserta
  dalam angkatan yang dipilih, status, nilai dan waktu pengerjaan dalam WIB.

API GET `/api/v1/academy/admin/progress` dan
`/api/v1/academy/admin/progress/{profileId}` memerlukan Admin Academy atau
Superadmin. Editor, mantan Pengajar, peserta, tamu dan admin modul lain tidak
berwenang. Guard berlaku di frontend dan Laravel; respons `no-store, private`.
Tidak mengirim jawaban, kunci, catatan belajar privat atau kredensial ke tabel admin.

## Perhitungan

Daftar berdasarkan keanggotaan angkatan, termasuk riwayat angkatan terdahulu.
Profil dihapus dan akun pengelola tidak masuk daftar peserta; akun peserta
nonaktif tetap muncul dengan penanda. Hitungan peserta dan penyelesaian memakai
seluruh hasil filter sebelum pagination, bukan hanya halaman yang terlihat.

Total ujian mencakup ujian terpublikasi pada materi/angkatan terpublikasi, termasuk
yang belum dibuka atau sedang nonaktif. Draft tidak masuk total. Urutan mengikuti
pembuatan ujian yang dipakai admin; nomor per jenis tetap konsisten.

Penyelesaian dihitung dari ID ujian berbeda dengan attempt `is_completed`, bukan
dari batas kelulusan. Retake lama tidak menggandakan hitungan; nilai menggunakan
nilai terbaik yang sudah selesai, termasuk nilai nol. Nilai total memakai bobot
Academy saat ini yang sama dengan perhitungan peserta; yang belum selesai
berkontribusi nol. Setelah seluruh Ujian Akhir yang terpublikasi selesai dan
memiliki nilai, label berubah dari sementara menjadi hasil akhir. Rata-rata hanya
memakai nilai ujian yang sudah selesai.

Status rincian: Selesai, Sedang dikerjakan, Belum dikerjakan, Belum dibuka,
Nonaktif, Terlewat (tidak pernah mulai sampai rentang akses berakhir), atau Waktu
habis (pernah mulai tetapi belum tercatat selesai). Rentang waktu tetap manual
admin. Deadline percobaan memperhatikan snapshot durasi/tenggat aslinya. GET
laporan tidak menyelesaikan percobaan atau membuat nilai perkiraan untuk attempt
yang belum disubmit. Waktu mulai/selesai pada hasil mengikuti attempt terbaik.

## Penghentian akun Pengajar

Peran Pengajar dihapus dari pilihan pembuatan akun Academy. Endpoint lama
`teacher/*` masih dipakai komponen admin yang ada, tetapi kini hanya menerima
Admin Academy/Superadmin. URL panel pengajar dialihkan ke Progres Peserta setelah
guard admin; tidak ada lagi ruang kerja atau navigasi Pengajar yang aktif.
Field `isTeacher` dipertahankan bernilai false demi kompatibilitas klien; viewer
menambahkan `isAdmin`. Profil pemateri/ustadz dan data materi tidak dihapus.

Migration `2026_11_18_000002_retire_academy_teacher_access` mencabut grant teacher
hanya pada Academy. Akun Core yang hanya dipakai sebagai Pengajar, bukan
Superadmin, tanpa akses modul lain maupun profil peserta aktif, dinonaktifkan dan
sesinya dicabut. Akun bersama tetap dapat dipakai pada modul lain. Akun yang juga
peserta tetap memiliki profil/riwayatnya. Identitas Core, materi, jawaban dan nilai
tidak dihapus. Rollback kode tidak mengaktifkan lagi hak akses yang sudah dicabut.

Pemeriksaan menggunakan fixture sintetis dan SQLite memory. Pencarian PAZ003 dalam
pengujian memakai data sintetis; bukan pembacaan akun PAZ003 di VPS.
