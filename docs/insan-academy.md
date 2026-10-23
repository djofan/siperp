# Insan Academy — operasional angkatan pertama

## Pengelolaan materi dan angkatan

- Buat angkatan di `/admin/academy/angkatan`. Jumlah peserta tidak dibatasi.
- Di `/admin/academy/materi`, pilih angkatan sebelum melihat atau membuat materi.
  Formulir hanya memuat angkatan, jenis Audio, judul, urutan, dan deskripsi singkat.
  Formulir tambah materi mendukung unggah audio dan publikasi dalam satu kali
  penyimpanan. Panel admin menampilkan semua materi angkatan tanpa pagination,
  diurutkan dari angka terkecil (mulai 0). Urutan berikutnya disarankan otomatis.
- Di editor materi, gunakan **Duplikat ke angkatan lain**. Judul, urutan,
  deskripsi dan audio disalin sebagai draft. Materi asal dan tujuan memiliki
  identitas terpisah; progres, nilai, dan sertifikat tidak ikut disalin.
- Audio duplikat menggunakan file penyimpanan yang sama dengan tautan akses
  baru milik materi tujuan. Mengganti audio salinan tidak mengubah audio asal.
- Kuis juga wajib memilih angkatan. Peserta hanya dapat membuka materi, file,
  dan kuis dari angkatan yang diikutinya.
- Menu peserta **Angkatan Saya** menyimpan riwayat keikutsertaan. Setelah semua
  ujian terpublikasi termasuk ujian akhir selesai dikerjakan (tidak harus lulus),
  akun dan NIP yang sama dapat mendaftar ke angkatan berikutnya yang dibuka.
  Tidak boleh mendaftar dua kali pada angkatan yang sama.
- Migrasi `2026_10_20_010000_scope_academy_learning_to_cohorts` mempertahankan
  materi dan riwayat lama. Program lama yang jelas asal angkatannya dipetakan
  kembali. Pustaka bersama dengan lebih dari satu calon angkatan tetap ada di
  **Arsip belum memiliki angkatan**, lalu diduplikasi admin ke angkatan tujuan.

## Batas upload

Audio maksimal 50 MB. Next Server Actions menyediakan ruang request 51 MB.
Server lokal `php artisan serve` memakai `api/php.d/uploads.ini`; restart server
setelah perubahan konfigurasi. Pada hosting, PHP/web server juga harus memakai
batas upload 50 MB dan request minimal 51 MB.

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
- Superadmin mengelola angkatan di `/admin/academy/angkatan`. Angkatan adalah
  kelompok peserta, terpisah dari program. Buat nama angkatan tanpa
  menyalin materi atau soal. Pilih angkatan ketika mendaftarkan peserta; angkatan
  juga dapat diubah melalui edit peserta. Jumlah peserta dihitung dari profil
  yang belum dihapus. Membuka pendaftaran web menutup angkatan lain secara atomik.
  Jadwal, ranking, nilai dan sertifikat tetap mengikuti program yang diikuti.
- Migrasi `2026_10_20_000000_create_academy_cohorts` memisahkan data angkatan
  lama dari program. Peserta dengan beberapa program memakai program pertama
  sebagai angkatan awal. Peserta tanpa program resmi dapat ditetapkan angkatannya
  melalui edit peserta. Enrollment dan riwayat belajar tidak dihapus.
