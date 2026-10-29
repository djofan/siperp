# Product Requirements Document (PRD)
## Platform Modular Solidaritas Insan Peduli (SIP)

**Versi:** 1.1 — diperbarui 14 Oktober 2026 (arsitektur frontend Next.js + backend Laravel)
**Status:** Berjalan; fondasi Laravel selesai, migrasi modul bertahap
**Stack:** Frontend Next.js (App Router, TypeScript); backend Laravel 13 (API REST, `api/`) untuk seluruh modul bisnis aktif; MySQL satu database bersama; satu repo

> **Status implementasi 29 Oktober 2026:** frontend Next.js dan seluruh backend bisnis aktif Laravel. Migration aktif berada di `api/database/migrations`; Prisma legacy hanya referensi. Penyebutan backend Next.js, Prisma, atau tahapan migrasi di uraian historis di bawah bukan instruksi runtime/deployment. Lihat [arsitektur aktif](arsitektur.md) dan README untuk alur saat ini.

---

## 1. Latar Belakang

Solidaritas Insan Peduli (SIP) saat ini menjalankan beberapa divisi/program lewat web dan sistem terpisah-pisah:

- `insanpeduli.org` — website induk, WordPress, berisi profil yayasan, program bantuan umum, dan tautan ke divisi-divisi.
- `lazsip.or.id` — WordPress, donasi diarahkan ke sini.
- `lazsiplp` — Next.js, sedang dibangun ulang untuk menggantikan `lazsip.or.id`, sudah punya backend Go sendiri (sebagian fitur sudah nyata, sebagian masih dummy).
- `sarsiplp` — Next.js, frontend SARSIP, sudah tersambung ke backend Go `db_sip`.
- `tanwir-qurani` — Laravel/Filament, aplikasi program pembelajaran Tanwir Qurani (di bawah naungan LAZSIP), sudah berjalan dengan panel Admin/Guru/Peserta.
- Divisi Pendidikan — belum punya sistem digital, detail fitur belum digali.

**Masalah yang mau diselesaikan:**
1. Terlalu banyak sistem terpisah, beda stack (Next.js, Go, Laravel), sulit dikelola satu tim kecil.
2. Setiap sistem punya login sendiri-sendiri — tidak ada satu pintu masuk untuk admin yang mengelola lebih dari satu divisi/program.
3. Menambah program baru (mis. Zakat Academy) berarti membangun sistem dari nol lagi, termasuk hosting dan auth-nya sendiri.

**Tujuan platform baru:**
- Satu platform (satu repo, satu database, satu sistem login) untuk semua divisi dan program (LAZSIP, SARSIP, Divisi Pendidikan, Tanwir Qurani, Ojol Mengaji, SIP sendiri, dan program-program mendatang). Secara teknis terdiri dari satu frontend Next.js dan satu backend Laravel, bukan satu aplikasi per divisi.
- Satu sistem login. Satu akun **superadmin** yang bisa membuat akun baru dan mengatur akun lain boleh mengakses modul apa saja (satu akun bisa punya akses ke lebih dari satu modul sekaligus).
- Modul-modul bersifat **flat/sejajar** — SIP, LAZSIP, SARSIP, Divisi Pendidikan, Tanwir Qurani, dan program-program mendatang semuanya modul yang setara, tidak ada hierarki induk-anak antar modul.
- Menambah modul baru di kemudian hari tidak boleh mengubah kode modul yang sudah ada, tidak butuh hosting baru, tidak butuh sistem login baru.

---

## 2. Prinsip Arsitektur

- **Modular monolith di kedua sisi**: satu aplikasi Next.js (frontend) dan satu aplikasi Laravel (backend API), masing-masing dipecah per modul — bukan microservices, bukan backend terpisah per modul.
- **Satu database (MySQL) bersama.** Saat ini tabel dan migration yang ada dimiliki Prisma; tiap modul punya file schema sendiri (`modules/<modul>/schema.prisma`, dan `prisma/schema/core.prisma` untuk Core) yang digabung otomatis. Laravel mengakses tabel yang sama lewat Eloquent. Siapa yang memegang migration jangka panjang belum diputuskan (lihat `arsitektur.md` §6). Tabel antar modul boleh saling berelasi bila memang perlu (mis. modul lapor ke `users` di Core), tapi sebisa mungkin berdiri sendiri.
- **Core** (dipakai semua modul): autentikasi, tabel `users`, `modules` (registry), `module_access` (izin akun ke modul), shell layout admin (sidebar dinamis), komponen UI dasar.
- **Struktur folder standar tiap modul** (rincian di `CLAUDE.md` §4):
  ```
  Frontend (Next.js)
  modules/<modul>/pages/         isi halaman publik (di-re-export oleh app/(public)/<modul>/)
  modules/<modul>/admin/pages/   isi halaman admin (di-re-export oleh app/admin/<modul>/)
  modules/<modul>/components/    komponen UI modul ini
  modules/<modul>/schema.prisma  tabel database modul ini
  modules/<modul>/api/           [hanya modul yang belum dimigrasikan] logic & endpoint Next.js

  Backend (Laravel)
  api/app/Modules/<Modul>/       controller, request, resource, model, policy, routes
  api/routes → /api/v1/<modul>   prefix otomatis lewat provider modul
  ```
- **Menambah modul baru** = menambah folder frontend dan backend di atas + satu baris di tabel `modules` + pemberian akses lewat panel superadmin. Modul lama tidak disentuh.
- **Migrasi bertahap (strangler):** backend tiap modul dipindah dari Next.js ke Laravel satu per satu. Modul yang belum dipindah tetap berjalan di Next.js. Urutan dan status ada di `arsitektur.md` §7.
- **Aset lama yang di-reuse, bukan ditulis ulang dari nol:**
  - Komponen React dari `lazsiplp` dan `sarsiplp` — dipindah apa adanya ke `components/lazsip/` dan `components/sarsip/`.
  - Aturan bisnis yang sudah terbukti jalan di backend Go (`db_sip` versi LAZSIP maupun SARSIP) dan di Laravel (`tanwir-qurani`) — dipakai sebagai referensi logic, ditulis ulang sebagai service di backend platform (TypeScript untuk modul yang belum dimigrasikan, PHP/Laravel setelah dimigrasikan), bukan dipanggil sebagai backend terpisah.

---

## 3. Skema Data Inti (Core)

```
users
- id, name, email, password_hash, is_superadmin, created_at

modules
- id, slug, name, description, is_active

module_access
- id, user_id (FK users), module_id (FK modules), role, created_at
```

Satu akun bisa punya banyak baris di `module_access` — itulah mekanisme "satu akun bisa akses lebih dari satu modul". Superadmin ditandai `is_superadmin = true`, otomatis bisa akses semua modul tanpa perlu baris akses.

---

## 4. Roadmap Fase — Ringkasan

| Fase | Modul/Fokus | Output utama |
|---|---|---|
| 0 | Fondasi & Core | Aplikasi kosong berjalan, auth + superadmin + registry modul siap |
| 0b | Fondasi Laravel API & migrasi Core | Fondasi selesai (kerangka sembilan modul, Sanctum, konvensi REST, kontrak OpenAPI); migrasi Core ke Laravel adalah langkah berikutnya, lalu modul lain satu per satu — detail: `docs/arsitektur.md` §7 |
| 1 | Modul LAZSIP | Website & admin LAZSIP lengkap, jadi modul pertama sekaligus pola acuan modul lain |
| 2 | Modul SIP | Portal induk (profil yayasan, program umum, laporan, blog, penghubung ke divisi lain) |
| 3 | Modul SARSIP | Website & admin tanggap bencana |
| 4 | Divisi Pendidikan | Modul profil & program pendidikan (scope perlu difinalisasi bareng tim) |
| 5 | Modul Tanwir Qurani | Pembinaan hafalan guru ngaji TPQ (admin/guru/peserta) dibangun ulang native — detail: `docs/prd-tanwir.md` |
| 5b | Modul Ojol Mengaji | Pembinaan hafalan driver ojek online, saudara Tanwir dengan co-reviewer — detail: `docs/prd-ojol.md` |
| 6 | Integrasi & Peluncuran | QA lintas modul, migrasi data lama, pelatihan admin, go-live |

Urutan ini mengikuti prioritas yang sudah disepakati: LAZSIP dulu (karena progresnya paling jauh), baru SIP, SARSIP, Pendidikan, dan terakhir Tanwir Qurani (paling kompleks, dan sudah berjalan baik di sistem lama sehingga tidak mendesak).

**Pembaruan 14 Oktober 2026:** ditambahkan Fase 0b (fondasi Laravel API). Fase 1–5b di bawah ditulis saat backend masih Next.js; backend tiap modul dimigrasikan ke Laravel bertahap **tanpa mengubah scope fitur** modul itu.

**Pembaruan 7 Oktober 2026:** Tanwir Qurani mulai dikerjakan, disusul Ojol Mengaji (keduanya sebelumnya Laravel/Filament terpisah). Tiap modul punya PRD sendiri di `docs/prd-<modul>.md` — PRD modul adalah acuan detail; dokumen ini hanya ringkasan lintas modul.

---

## Fase 0 — Fondasi & Core

**Tujuan:** Membangun kerangka aplikasi yang akan ditumpangi semua modul, sebelum satu pun modul konten dibangun.

**Yang dikerjakan:**
- Setup project Next.js baru (App Router, TypeScript, Tailwind).
- `prisma/schema/core.prisma`: tabel `users`, `modules`, `module_access`.
- Sistem login (session/JWT), halaman `/admin/login`.
- `middleware.ts`: proteksi semua route `/admin/**`, redirect ke login kalau belum ada sesi.
- Shell dashboard admin: sidebar yang isinya dibaca dinamis dari `module_access` milik akun yang login.
- Halaman superadmin:
  - `/admin/super/akun` — buat akun baru, lihat daftar akun, atur `module_access` per akun (centang modul mana saja).
  - `/admin/super/modul` — daftar modul terdaftar di `modules` (baca saja dulu di fase ini, karena belum ada modul konten).
- Design system dasar: warna, tipografi, komponen `ui/` (button, card, modal, table, form field) — dipakai semua modul supaya tampilan konsisten.
- Setup deployment (hosting, environment variable, database production).

**Definition of done:** Bisa login sebagai superadmin, bisa membuat akun baru, bisa memberi/mencabut akses modul (meski modulnya belum ada isinya), aplikasi sudah live di domain production walau masih kosong kontennya.

---

## Fase 0b — Fondasi Laravel API & Migrasi Core

**Tujuan:** Menyiapkan backend Laravel yang berdampingan dengan Next.js, supaya backend modul bisa dimigrasikan bertahap tanpa mengganggu modul yang sedang berjalan.

**Sudah selesai (branch `feature/laravel-api`):** Laravel 13 di `api/` dengan kerangka sembilan modul (Core, Payment, Lazsip, Sip, Academy, Sarsip, Tanwir, Ojol, Teknisi); autentikasi Sanctum Bearer token (kedaluwarsa absolut 7 hari); kompatibilitas hash bcrypt dua arah dengan Next.js; ID CUID v1 dan timezone UTC; `/api/v1/health`; login placeholder dengan limiter; middleware akses modul yang gagal tertutup; konvensi REST (`api/docs/CONVENTIONS.md`) dan kontrak OpenAPI (`api/docs/openapi.json`).

**Belum dikerjakan:** migrasi Core (login/logout sungguhan, otorisasi `module_access`), integrasi token di Next.js, idempotensi production, keputusan kepemilikan migration database, serta migrasi modul bisnis.

**Definition of done fase ini:** Core berjalan di Laravel (login, logout, otorisasi modul), Next.js memakai API Core, dan keputusan kepemilikan migration sudah dicatat di `docs/arsitektur.md` §6.

---

## Fase 1 — Modul LAZSIP

**Tujuan:** Mengganti `lazsip.or.id` (WordPress) dan menuntaskan `lazsiplp`, sekaligus jadi "modul acuan" pola pengerjaan modul-modul berikutnya.

**Aset yang di-reuse:** komponen React dari repo `lazsiplp` (kartu, form, layout admin — sudah sesuai desain warm cream/hijau tua sesuai referensi), serta aturan bisnis dari backend Go yang sudah ada (kalkulasi zakat, aturan privasi data penerima manfaat, alur CRUD).

### Fitur publik
- Beranda: hero, tentang LAZSIP (visi-misi, legalitas), floating tombol WhatsApp.
- Berita: pola pinned (2–3 item) + grid 2 kolom, halaman detail.
- Kalkulator Zakat: hitung otomatis dari harga emas real-time (di-cache berkala), tombol "Bayar Zakat" ke form pembayaran.
- Donasi: pola pinned + grid, saldo terkumpul real-time per campaign, detail campaign dengan progress bar, form donasi (nominal cepat/custom, checkbox opsional tanggung biaya admin, toggle anonim).
- Program Pemberdayaan: pola pinned + grid, status pendaftaran bisa ditutup admin (badge "Pendaftaran Ditutup"/"Kuota Penuh").
- Section Divisi Pendidikan & SARSIP (ditampilkan bertumpuk, dibedakan lewat kolom kategori pada tabel `programs`).
- Kegiatan: pola pinned + grid, halaman detail.
- Penyaluran Bantuan: filter chip per tipe bantuan (Pendidikan/Kesehatan/Kebutuhan Pokok/Lainnya), field publik vs admin-only sesuai aturan privasi (alamat, tanggal lahir asli, status pernikahan tidak pernah ke publik).
- Counter transparansi publik (total dana terkumpul, jumlah donatur, jumlah penerima manfaat) — tanpa feed publik siapa yang membayar.
- Halaman kontak.

### Fitur admin
- Login, ganti password.
- CRUD: Berita, Campaign Donasi, Program Pemberdayaan, Kegiatan, Penerima Manfaat, Mitra, Konten Umum (hero/tentang/legalitas), Referensi Biaya Payment.
- **Kelola Transaksi** — riwayat pembayaran donasi & zakat (belum ada di sistem lama, dibangun baru).
- **Kelola Donatur** — rekap otomatis dari transaksi, tersegmentasi donatur infaq/donasi vs muzakki zakat (belum ada di sistem lama, dibangun baru).
- **Kelola Pendaftar** — pendaftar Program Pemberdayaan & Pendidikan (belum ada di sistem lama, dibangun baru).
- Dashboard overview: statistik donasi/zakat bulan ini, campaign paling laris, transaksi terbaru.

### Entitas data (`modules/lazsip/schema.prisma`)
```
news, campaigns, donations, zakat_payments, programs,
activities, beneficiaries, donors, payment_fees, partners, site_content
```

### Catatan pembayaran
- Zakat settle ke rekening khusus zakat; donasi/infaq (semua campaign) settle ke satu rekening bersama, dibedakan lewat `kode_unik` per campaign.
- Status transaksi `paid` hanya berubah lewat webhook payment gateway (bukan redirect sukses di frontend).
- Payment gateway belum diputuskan — bangun dulu alur sampai tahap simulasi (mark paid/failed manual), payment gateway sungguhan menyusul begitu diputuskan.

**Definition of done:** Semua fitur di atas jalan di platform baru (bukan manggil backend Go lagi — saat Fase 1 ditulis, backend-nya Next.js; migrasi ke Laravel mengikuti Fase 0b), terhubung ke sistem auth Core (bukan JWT sendiri), dan LAZSIP bisa dipakai sehari-hari oleh admin sebagai pengganti `lazsip.or.id`.

---

## Fase 2 — Modul SIP (Portal Induk)

**Tujuan:** Menjadi pengganti `insanpeduli.org`, sebagai pintu masuk publik yang mengenalkan yayasan dan menautkan ke semua divisi.

**Referensi fitur** (dari `insanpeduli.org` yang berjalan sekarang):

### Fitur publik
- Beranda: hero banner, CTA "Infaq Sekarang" (tautan ke modul LAZSIP) dan "Pengajuan Bantuan" (WhatsApp), kegiatan terkini (carousel/slider), peta jangkauan penerima manfaat, carousel Program Bantuan SIP.
- Profil: Tentang SIP (sejarah, visi-misi), Struktur Pengurus SIP, Jangkauan Bantuan SIP.
- Program Bantuan SIP: Bantuan Kesehatan, Bantuan Pendidikan, Bantuan Kebutuhan Pokok, Santunan Anak Yatim, Santunan Anak Asuh, Santunan Lembaga Tahfidz, Sedekah Air Bersih — tiap program berupa halaman info + tombol infaq yang mengarah ke campaign terkait di modul LAZSIP.
- Divisi: kartu/tautan ke LAZ SIP (modul LAZSIP), SAR SIP (modul SARSIP), Mahad Tahfidz SIP (modul Pendidikan/Tanwir Qurani, tergantung penempatan final).
- Blog (bisa dibagi dengan atau terpisah dari Berita LAZSIP — perlu diputuskan bareng tim, apakah "Blog SIP" itu wadah umum lintas divisi atau LAZSIP tetap punya beritanya sendiri).
- Laporan: Laporan Bulanan, Laporan Tahunan (unduhan PDF atau halaman baca).
- Footer: profil legalitas ringkas, sosial media, alamat kantor, kontak/call center WhatsApp.
- Mitra/pendukung (logo-logo perusahaan pendukung).

### Fitur admin
- CRUD: Struktur Pengurus, Halaman Profil (Tentang, Jangkauan Bantuan), Program Bantuan SIP (info umum, bukan campaign donasi — itu tetap di LAZSIP), Blog SIP, Laporan Bulanan/Tahunan (upload PDF/isi konten), Kegiatan Terkini, Mitra.
- Kelola tautan antar-divisi (supaya kalau ada modul baru, cukup ditambahkan link-nya dari sini tanpa ubah kode).

### Entitas data (`modules/sip/schema.prisma`)
```
pengurus, profil_pages, laporan (bulanan/tahunan), blog_sip,
kegiatan_terkini, mitra, program_bantuan_info
```

**Definition of done:** `insanpeduli.org` bisa sepenuhnya digantikan, semua tautan "Infaq Sekarang" mengarah ke campaign LAZSIP yang benar, dan halaman Divisi menautkan ke modul yang sudah ada.

---

## Fase 3 — Modul SARSIP

**Tujuan:** Menyelesaikan pola yang sudah dirintis di `sarsiplp` (sudah tersambung ke backend Go), dipindahkan jadi modul native.

**Aset yang di-reuse:** komponen React dari `sarsiplp` (tema hijau emerald + amber gold, identitas "tim SAR lapangan"), serta struktur data yang sudah terbukti jalan lewat `db_sip` (Campaign, News, Program, Distribution Report dengan kategori bencana: Banjir, Gempa Bumi, Tsunami, Tanah Longsor, Kebakaran Hutan, Evakuasi & SAR).

### Fitur publik
- Beranda: hero, dual CTA ("Tunaikan Donasi" & "Konsultasi Zakat via WhatsApp"), quick stat counter (dana tersalurkan, jumlah mustahik, program aktif).
- Campaign Donasi: grid kartu program tanggap bencana, progress bar, sisa hari.
- Berita & Laporan Penyaluran: daftar artikel kegiatan lapangan + dokumentasi.
- Dokumentasi Penyaluran: laporan transparansi per kategori bencana.
- Floating WhatsApp CTA.
- Footer: legalitas yayasan, rekening resmi (bank & QRIS), alamat & jam operasional.

### Fitur admin
- Login (terhubung ke sistem auth Core, bukan auth sendiri lagi).
- CRUD Campaign Donasi (judul, kategori bencana, target nominal, deskripsi, banner, status aktif/selesai).
- CRUD Berita/Laporan (judul, kategori, thumbnail, konten, tanggal, status draft/publish).
- Pengaturan umum: nomor WhatsApp, template pesan otomatis, rekening donasi.

### Entitas data (`modules/sarsip/schema.prisma`)
```
campaigns, news, distribution_reports, programs, settings
```

**Definition of done:** SARSIP jalan penuh sebagai modul native (tidak lagi memanggil `db_sip` Go), dengan data historis dari `db_sip` dipindahkan/diimpor ke database baru.

---

## Fase 4 — Modul Divisi Pendidikan

**Tujuan:** Memberi Divisi Pendidikan kehadiran digital pertamanya di dalam platform.

**Catatan penting:** scope fitur modul ini **belum digali detail** dari tim/senior — daftar di bawah adalah asumsi awal berdasarkan pola LAZSIP/SARSIP, dan wajib dikonfirmasi ulang sebelum mulai membangun fase ini.

### Asumsi fitur awal (perlu konfirmasi)
- Publik: profil Divisi Pendidikan, daftar sekolah/lembaga binaan, program bantuan pendidikan yang dijalankan, galeri kegiatan.
- Admin: CRUD lembaga binaan, CRUD program, laporan penyaluran bantuan pendidikan.
- Pertanyaan terbuka: apakah Divisi Pendidikan hanya "etalase informasi" (seperti section yang sudah ada di LAZSIP sekarang), atau punya sistem kerja sendiri (pendataan siswa, laporan sekolah binaan, dst) yang lebih dalam?

### Entitas data (sementara, rencana `modules/pendidikan/schema.prisma`)
```
lembaga_binaan, program_pendidikan, laporan_penyaluran
```

**Definition of done:** Menunggu hasil klarifikasi scope — fase ini idealnya dimulai dengan sesi requirement gathering singkat sebelum eksekusi teknis.

---

## Fase 5 — Modul Tanwir Qurani

**Tujuan:** Membangun ulang seluruh fitur `tanwir-qurani` (Laravel/Filament) menjadi modul native dengan
tampilan baru yang elegan & minimalis, tanpa kehilangan fitur maupun aturan bisnisnya.

**Spesifikasi lengkap: `docs/prd-tanwir.md`.** Ringkasan:
- **Peran:** Admin (di `/admin/tanwir`), Guru/PIC kelompok (`/tanwir/guru`), Peserta = **guru ngaji TPQ**
  (`/tanwir/peserta`). Anak didik adalah data santri yang dicatat peserta, **bukan** akun login
  (koreksi atas versi awal dokumen ini).
- **Login:** kode akun (GTQ001/PTQ001) yang menerbitkan sesi Core — tidak ada sistem auth terpisah.
- **Fitur inti:** tugas voice note/video/kuis dengan tenggat & perpanjangan, rekam langsung dari browser,
  antrean koreksi (setujui/tolak + riwayat percobaan), kuis bernilai otomatis, data anak didik, peta
  sebaran (MapLibre + OpenFreeMap, gratis tanpa API key), pengingat WhatsApp ke guru (tautan `wa.me`).
- **File setoran** privat, disimpan di luar folder publik dan diputar lewat endpoint berizin.

**Definition of done:** lihat `docs/prd-tanwir.md` §12. Data aplikasi lama **tidak dimigrasi** — Tanwir & Ojol mulai dari nol.

---

## Fase 5b — Modul Ojol Mengaji

**Tujuan:** Membangun ulang `ojol-mengaji` (Laravel/Filament) — program hafalan untuk driver ojek online.
Dikerjakan **setelah Tanwir selesai**, memakai pola yang sama di folder modulnya sendiri.

**Spesifikasi: `docs/prd-ojol.md`** (berisi perbedaan dari Tanwir): kelompok tanpa PIC, guru memilih
kelompok penerima tugas, ada **co-reviewer**, tanpa anak didik, situs publik dengan halaman Cara Bergabung.

---

## Fase 6 — Integrasi, QA, dan Peluncuran

**Tujuan:** Memastikan seluruh modul berjalan mulus sebagai satu kesatuan sebelum go-live penuh, dan proses lama benar-benar bisa ditinggalkan.

**Yang dikerjakan:**
- Uji lintas modul: login satu akun dengan akses ke beberapa modul sekaligus, pastikan sidebar dan izin akses bekerja benar di semua kombinasi.
- Migrasi data final dari sistem lama (WordPress `insanpeduli.org` & `lazsip.or.id`, database Go `db_sip` LAZSIP & SARSIP, tanpa Tanwir Qurani & Ojol Mengaji yang mulai dari nol) ke database baru.
- Uji beban dasar (aplikasi tetap responsif walau semua modul aktif bersamaan dalam satu proses).
- Pelatihan penggunaan dashboard untuk admin tiap divisi.
- Setup domain final, redirect dari domain-domain lama ke platform baru.
- Dokumentasi teknis: cara menambah modul baru (mengikuti pola yang sudah dipraktikkan sejak Fase 1), cara mengelola akun & akses lewat panel superadmin.
- Rencana pasca-launch: pemantauan error, backup database rutin, jadwal review kebutuhan modul baru (mis. Zakat Academy, Teknisi HP, dll) yang tinggal ditambahkan mengikuti pola modular yang sudah baku.

**Definition of done:** Semua domain lama sudah dialihkan, semua tim divisi sudah bisa login dan bekerja di sistem baru, sistem lama (WordPress, Go, dan aplikasi Laravel/Filament lama `tanwir-qurani` & `ojol-mengaji`) resmi dipensiunkan. Catatan: Laravel di folder `api/` adalah backend platform baru, **bukan** sistem lama yang dipensiunkan.

---

## 5. Risiko & Catatan Terbuka

- **Payment gateway** belum diputuskan (LAZSIP & SARSIP) — perlu keputusan sebelum Fase 1/3 masuk tahap alur pembayaran sungguhan.
- **Scope Divisi Pendidikan** belum jelas — Fase 4 butuh sesi requirement gathering terlebih dulu.
- **Migrasi fitur kompleks Tanwir Qurani & Ojol Mengaji** (rekaman, kuis, peta) adalah fase dengan risiko waktu paling tinggi — dipecah: Tanwir dulu sampai lulus DoD, baru Ojol.
- **Penyimpanan file setoran** saat ini di disk server (`.tanwir-uploads/`, `.ojol-uploads/`) — wajib volume persisten & ikut backup; pindah ke object storage bila volume membesar.
- **Duplikasi kemungkinan backend `db_sip`** — perlu dipastikan LAZSIP dan SARSIP tidak sedang menyimpan data yang seharusnya sama di dua tempat berbeda sebelum migrasi Fase 1 & 3 dimulai.
- **Kepemilikan migration database (Prisma vs Laravel)** belum diputuskan. Dua sistem migration yang menulis ke database yang sama mudah bentrok — harus diputuskan dan dicatat sebelum modul bisnis pertama dimigrasikan (`arsitektur.md` §6).
- **Dua backend berjalan bersamaan selama transisi** (Next.js untuk modul yang belum dimigrasikan, Laravel untuk yang sudah) — perlu disiplin agar aturan bisnis kritis (uang, privasi) tidak terduplikasi atau berbeda perilaku antar keduanya.
- **Cara menjalankan dua proses di production** (hosting, reverse proxy, PHP ≥ 8.4.1) belum dikonfigurasi.
- **Nama domain final untuk tiap modul** (subdomain vs subpath, mis. `sip.or.id/lazsip` vs `lazsip.sip.or.id`) belum diputuskan — perlu disepakati sebelum Fase 0 selesai karena mempengaruhi konfigurasi routing.

---

## 6. Urutan Kerja yang Direkomendasikan

1. Fase 0 (Fondasi) — wajib selesai duluan, semua fase lain bergantung padanya.
2. Fase 1 (LAZSIP) — sekaligus jadi pola acuan & pembuktian arsitektur modular ini bekerja.
3. Fase 2 (SIP) — setelah LAZSIP ada, tautan "Infaq Sekarang" di SIP sudah punya tujuan yang nyata.
4. Fase 3 (SARSIP) — mengikuti pola yang sudah terbukti dari Fase 1.
5. Fase 4 (Pendidikan) — didahului sesi klarifikasi kebutuhan.
6. Fase 5 (Tanwir Qurani) lalu 5b (Ojol Mengaji) — Tanwir dulu sampai lulus DoD-nya, baru Ojol dibangun dengan pola yang sama.
7. Fase 6 (Integrasi & Peluncuran) — penutup, memastikan semua modul benar-benar siap dipakai bersamaan.