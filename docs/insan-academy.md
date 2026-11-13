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

## Impor pendaftaran peserta dari Excel

1. Buka panel **Pendaftaran** di `/admin/academy/pendaftaran`, lalu pilih
   **Unduh template Excel**. Panel **Peserta** hanya menampilkan daftar peserta;
   pengelolaan angkatan berada di panel **Angkatan**.
2. Isi satu lembar dengan judul kolom **Nama**, **No HP**, **Alamat** pada baris
   pertama. Data dimulai baris kedua. Semua kolom wajib diisi; maksimal 200 peserta
   dan ukuran file 5 MB dalam format `.xlsx`. Simpan file `.xls` lama sebagai `.xlsx`.
3. Pilih angkatan dan grup **Ikhwan/Akhwat** untuk seluruh peserta pada file.
   Pisahkan file bila grup berbeda. Angkatan tidak harus dibuka untuk pendaftaran
   publik dan tidak perlu memiliki materi terlebih dahulu.
4. Pilih file, periksa pratinjau, lalu tekan **Impor peserta**. Nomor HP menerima
   awalan `08`, `628`, `+628`, atau `8` jika Excel menghilangkan nol pertama.
   Gunakan format teks pada kolom No HP agar angka awal tetap terlihat.
5. Setelah berhasil, segera pilih **Unduh akun peserta** sebelum meninggalkan
   halaman atau memilih file lain. Bagikan NIP dan password awal kepada peserta
   terkait. Password awal peserta baru dari impor adalah `12345678`; peserta
   wajib menggantinya sebelum belajar dengan password baru minimal 10 karakter.
   Password disimpan sebagai hash. Impor ulang tidak mereset akun lama; perubahan
   ini juga tidak mengubah password akun yang sudah dibuat sebelumnya.

Validasi backend menyebut nomor baris yang bermasalah. Satu baris salah membatalkan
seluruh batch, termasuk akun yang sempat dibuat dalam transaksi tersebut. Perbaiki
file lalu pilih ulang; pilihan angkatan/grup dan pratinjau tidak hilang saat validasi
gagal. Peserta aktif yang sama (nama tanpa membedakan kapital, nomor HP, alamat,
keanggotaan angkatan, dan grup) dilewati tanpa mengganti akun/password. Nomor HP
yang sudah dipakai dengan data, grup, atau angkatan berbeda ditolak; koreksi melalui
Daftar Peserta. Kepindahan angkatan tetap mengikuti aturan penyelesaian ujian.

File dibaca di browser; hanya data baris dikirim ke API Laravel. File Excel sumber
tidak disimpan sebagai upload. Endpoint impor khusus admin Academy/superadmin dan
respons akun menggunakan `Cache-Control: no-store, private`. Fitur ini tidak
memerlukan migration baru.

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
- Setiap soal dapat diberi satu gambar JPG/PNG/WebP (maksimal 5 MB) atau audio
  MP3/WAV/OGG/M4A/WebM (maksimal 15 MB), lengkap dengan teks alternatif.
  Media disimpan privat dan hanya dapat dibuka oleh pengajar/admin atau peserta
  yang memiliki akses ke ujian tersebut. Pengajar dapat mengganti atau menghapus
  media melalui editor soal; peserta melihat atau memutarnya di soal dan pembahasan.
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

## Bab per angkatan

Angkatan baru otomatis memiliki 12 bab dan durasi 30 hari. Untuk angkatan lama, admin membuka Peserta > Angkatan > Siapkan 12 bab. Editor program terbuka untuk mengubah judul dan susunan bab. Persiapan idempoten, tidak menghapus konten/progres lama atau memangkas bab yang sudah lebih dari 12. Pengajar mengatur hari rilis materi 1-30.

Teacher materials support file upload or direct browser recording (microphone permission and HTTPS/localhost required). Recordings are previewed before saving with the material, with a 50 MB limit. Release day counts from course startsAt in WIB (1 = first day); order sorts materials inside a chapter.

Daily teacher material form: release day and order inputs removed. New lessons append under a chapter lock; edits retain position. Teacher saves set releaseDay=1, respecting course start and publication/access rules. Existing unsaved materials and quiz schedules remain unchanged.

Teacher material table: GET /api/v1/academy/teacher/materials?view=table&cohort={cohortId}&page=1 returns paginated lesson rows (10/page), actual cohort/chapter labels, publication/audio information, selector metadata and totals. Cohort filter is applied in Laravel before pagination; changing filters resets the page in the UI. Legacy requests without view=table keep their chapter response.

Teacher exam and question tables: GET teacher/quizzes?view=table supports cohort filter and page; GET teacher/quizzes/{id}?view=table supports question page. Both use 10 rows/page in Laravel with stable ordering and clamp excess pages. Legacy response remains without view=table. Question keys/options require teacher/admin authorization. UI exposes exam configuration and question editing separately from table rows.

Teacher exam creation: DAILY selects cohort curriculum and chapter; WEEKLY/FINAL select cohort curriculum only (courseId). Backend retains an internal chapter relationship for compatibility and preserves existing relationships on edit. The UI labels weekly/final scope as all chapters.

Academy UX: teacher/admin dashboards include workflow guides; participant dashboard prioritizes recent cohort materials and exam reminders. GET materials accepts sort=latest (created_at desc,id desc), preserving cohort/publication access. Material forms offer explicit draft/publish actions. Exam activation includes a review of scope, question count, duration and WIB schedule; server publication validation remains authoritative. No automatic activation or messaging is performed by dashboard guides.

Teacher Q&A: GET teacher/questions?view=table&page=1 returns 10 discussions/page (unanswered first); GET teacher/questions/{id} reads private detail. Teacher/admin authorization applies to both and the existing answer PUT. The dedicated answer page redirects back to the table after a successful save, preserving page and showing confirmation; validation errors remain on the answer form.

Participant Q&A now has a 10-row paginated table, separate create/detail pages, and return-to-table confirmation on successful submission. GET learning/discussions?view=table uses the existing participant/enrollment scope; GET learning/discussions/{id} returns only owned discussions in published enrolled courses (foreign IDs 404). Session schedules remain accessible below the table.

Live Q&A scheduling UI: teacher Questions > Live session schedule tab. Select cohort curriculum, title, future WIB datetime and meeting URL. Existing POST courses/{courseId}/sessions creates the schedule; new GET teacher/sessions returns manager-only options and a 10-row paginated session list. Enrolled participants see the meeting under Q&A session schedules; other cohorts cannot see it.

### Predikat nilai dan sertifikat

Predikat mengikuti nilai akhir: 0–50 Maqbul, di atas 50–70 Jayyid, di atas 70–85 Jayyid Jiddan, di atas 85–95 Mumtaz, dan di atas 95–100 Mumtaz Murtafi. Nilai desimal mengikuti batas atas ini tanpa pembulatan tambahan. Sertifikat tidak memiliki batas nilai minimum atau syarat pengerjaan: semua peserta terdaftar memperoleh sertifikat keikutsertaan setelah seluruh tenggat ujian berakhir. Minimal ada ujian akhir terpublikasi, dan semua ujian terpublikasi harus memiliki tenggat. Penyelesaian materi bukan syarat sertifikat. Status lulus ujian lama tetap tersimpan untuk kompatibilitas, tetapi tidak menghalangi sertifikat.

### Rencana kalender evaluasi bulanan

Acuan penyusunan jadwal oleh admin: 12 ujian harian (Senin–Kamis pada tiga pekan pertama), 3 ujian pekanan (akhir pekan pada tiga pekan pertama), pekan keempat tanpa ujian harian/pekanan, lalu ujian akhir pada akhir periode. Ini adalah rencana penyusunan kalender, bukan otomatisasi atau perubahan jadwal ujian yang sudah tersimpan.

### Poin jawaban evaluasi

Ujian harian dan pekanan memberikan bobot penuh untuk jawaban benar dan setengah bobot soal untuk jawaban salah yang terisi. Soal kosong tetap nol. Pada soal MULTIPLE, kombinasi jawaban harus tepat untuk poin penuh; kombinasi tidak tepat yang terisi mendapat setengah bobot. Ujian akhir memberi nol untuk jawaban salah atau kosong. Jenis ujian disimpan dalam snapshot saat mulai; snapshot lama yang belum selesai menggunakan jenis ujian saat diselesaikan. Nilai yang sudah selesai tidak dihitung ulang otomatis.

### Hasil pengerjaan peserta

Peserta dapat melihat soal snapshot, jawaban yang dipilih, kunci benar dan pembahasan miliknya segera setelah ujian selesai, tanpa menunggu tenggat ujian. Jawaban benar/salah/tidak dijawab diberi label. Snapshot ujian yang belum selesai tetap menyembunyikan kunci dan pembahasan; endpoint tetap membatasi akses pada pemilik ujian. Halaman hasil tidak menampilkan panel nilai.

### Card Progres dan status hasil

Progres peserta menampilkan tiga card: ujian selesai/total ujian dipublikasikan, rata-rata nilai ujian yang sudah dinilai, dan nilai total dari perhitungan bobot Laravel yang sama dengan peringkat. Label sementara berubah menjadi Hasil akhir setelah seluruh ujian akhir yang dipublikasikan telah selesai dan dinilai; nilai nol tetap sah. Status ini terpisah dari akses sertifikat yang dibuka setelah seluruh tenggat ujian berakhir. Jika tidak ada ujian akhir, status tetap sementara.

### Peringkat dan menu Sertifikat

Menu Peringkat berdiri sendiri. Menu Sertifikat muncul langsung di bawah Peringkat setelah periode semua ujian berakhir, meskipun peserta tidak mengerjakan ujian. Tidak adanya tenggat atau ujian akhir membuat menu tetap tersembunyi. Sertifikat keikutsertaan memakai tanggal tenggat terakhir. Nilai sama dibandingkan dengan total durasi pengerjaan: durasi tercepat dari pengerjaan dengan nilai terbaik per ujian dijumlahkan; ujian kosong/tanpa nilai menggunakan batas waktu penuh. Nilai dan durasi sama dibandingkan dengan waktu selesai seluruh ujian yang lebih awal, lalu nama secara abjad tanpa membedakan kapital. Nomor peringkat selalu berurutan dan unik; ID profil internal menjadi penentu stabil terakhir bila nama pun identik. Daftar semua peserta aktif ditampilkan hanya pada angkatan yang diikuti pengguna; tabel hanya menampilkan peringkat, nomor peserta, nama, nilai dan predikat, tanpa kontak atau jawaban peserta lain. Durasi serta waktu selesai tetap dipakai untuk pengurutan di backend.

### Email profil peserta

Email dapat diperbarui melalui Edit profil. Validasi, normalisasi lowercase/trim, dan keunikan email lintas akun dilakukan Laravel; nama dan email Core disimpan atomik dengan kontak Academy. Nomor akun/peserta, kelompok, angkatan dan password tetap tidak dapat diubah dari form profil ini.

### Dashboard admin Academy

Dashboard memakai ringkasan Angkatan, Peserta aktif (profil belum dihapus dan akun Core aktif), Materi, dan Ujian. Tautan pengelolaan menuju halaman Angkatan, Pendaftaran, Peserta, Materi, Ujian, serta Sertifikat. Istilah program/bab tidak ditampilkan pada dashboard. Struktur penyimpanan internal tetap dipertahankan agar riwayat peserta, materi dan ujian tidak berubah.
