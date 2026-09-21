# PRD — Modul LAZSIP

**Bagian dari:** Platform Modular SIP (lihat `PRD.md` untuk arsitektur & roadmap keseluruhan)
**Fase:** 1 (dikerjakan pertama)
**Stack modul ini:** Next.js (App Router), Prisma, MySQL — native, tanpa backend terpisah
**Status:** Draft untuk direview sebelum eksekusi

---

## 1. Ringkasan

LAZSIP (LAZ Solidaritas Insan Peduli) adalah divisi zakat & donasi di bawah SIP. Modul ini menggantikan `lazsip.or.id` (WordPress) dan menuntaskan pekerjaan yang sudah dimulai di repo `lazsiplp`, dengan menulis ulang seluruhnya sebagai modul native di platform baru — mengikuti struktur folder standar (`app/(public)/lazsip`, `app/admin/lazsip`, `app/api/lazsip`, `modules/lazsip`, `components/lazsip`, `prisma/schema/lazsip.prisma`) dan terhubung ke sistem auth Core (bukan login sendiri lagi).

**Aset yang di-reuse:** komponen React dari `lazsiplp` (sudah sesuai arah desain), serta aturan bisnis yang sudah terbukti jalan di backend Go sebelumnya (validasi, kalkulasi zakat, aturan privasi data penerima manfaat).

## 2. Arah Desain

- Warna: latar krem/off-white hangat, warna aksen utama hijau tua.
- Tombol & badge: bentuk pil penuh (fully rounded).
- Headline besar dan tebal.
- Kartu (campaign, program, berita, kegiatan): foto di atas, badge kategori, progress bar (untuk campaign donasi).

## 3. Fitur Publik

### 3.1 Beranda
- Hero section, ringkasan tentang LAZSIP, legalitas.
- Tombol WhatsApp mengambang (site-wide, semua halaman publik).

### 3.2 Berita
- Baris pinned (2–3 item) yang bisa digeser/drag horizontal, sisanya tampil grid maksimal 2 kolom (4–5 baris).
- Halaman detail berita.

### 3.3 Kalkulator Zakat
- Hitung otomatis nilai zakat dari nominal harta yang dimasukkan, berdasar harga emas real-time (di-cache, di-refresh berkala — bukan fetch setiap request).
- Tombol **"Bayar Zakat"** membuka form pembayaran, lanjut ke alur payment gateway.
- Form pembayaran zakat memakai aturan field identitas yang sama seperti form Donasi (lihat §3.4) — Nama wajib, Nomor WhatsApp/Email minimal salah satu wajib diisi, dan donatur menerima kode pelacakan setelah submit.
- Dana zakat settle ke **rekening khusus zakat**, terpisah dari rekening donasi/infaq.

### 3.4 Donasi
- Layout sama seperti Berita: pinned + grid.
- Tiap campaign donasi menampilkan saldo terkumpul real-time (progress bar).
- Halaman detail campaign + form donasi:
  - **Nama** — wajib diisi.
  - **Nomor WhatsApp** dan **Email** — keduanya ditampilkan sebagai field, tapi **minimal salah satu wajib diisi** (boleh isi dua-duanya, boleh isi salah satu saja). Validasi: submit ditolak kalau dua-duanya kosong.
  - Input nominal (cepat/preset atau custom).
  - Checkbox **"tanggung biaya admin"**, tercentang secara default (donatur menanggung biaya admin payment gateway) — donatur bisa uncheck untuk opt-out.
  - Opsi donasi anonim (anonim di tampilan publik saja — data Nama/WA/Email tetap tersimpan di database untuk keperluan pengelolaan donatur, tidak pernah benar-benar anonim ke admin).
- Setelah submit, donatur menerima **kode pelacakan unik** (mis. `LZS-7F3K2Q`) — **selalu ditampilkan di layar**, dan **dikirim juga ke email** kalau donatur mengisi email (Fase 1: pengiriman lewat email saja, lewat Resend — lihat §7). Kalau donatur cuma mengisi WA tanpa email, kode pelacakan tetap ada karena ditampilkan di layar, cukup dicatat sendiri oleh donatur. Kode ini dipakai di fitur Cek Status Pembayaran (§3.11).
- Semua campaign donasi (Donasi Banjir, Donasi NTT, dst) settle ke **satu rekening bersama**, dibedakan lewat kode unik per campaign saat rekonsiliasi.
- Status transaksi `paid` **hanya** boleh berubah lewat webhook payment gateway — tidak boleh ditandai lunas hanya karena halaman redirect sukses ditampilkan (rawan dimanipulasi).

### 3.5 Program Pemberdayaan
- Layout pinned + grid.
- Halaman detail: info program, syarat pendaftaran, tombol CTA "Daftar Sekarang".
- Admin bisa menonaktifkan tombol pendaftaran per program (mis. kuota penuh) — tombol berubah jadi status nonaktif, bukan dihilangkan.

### 3.6 Section Divisi Pendidikan & SARSIP
- Dua section terpisah, ditampilkan bertumpuk (atas-bawah, bukan sisi-sisi), masing-masing menampilkan program terkait divisi tersebut.
- Dikelola CRUD dari admin LAZSIP (menampilkan ringkasan/tautan, bukan mengelola data modul Pendidikan/SARSIP itu sendiri).

### 3.7 Kegiatan
- Layout pinned + grid, halaman detail.

### 3.8 Penyaluran Bantuan
- Filter berbentuk tab/chip per tipe bantuan: Pendidikan, Kesehatan, Kebutuhan Pokok, Lainnya. Tanpa filter dipilih → semua tipe tampil campur/acak.
- **Kartu publik** menampilkan: nama, jumlah bantuan diterima.
- **Halaman detail publik** menampilkan: nama, usia, masalah yang dihadapi, jenis kelamin, foto, cara mengetahui LAZSIP, kebutuhan, nama verifikator, wilayah cakupan verifikator.
- **Tetap admin-only** (tidak pernah tampil ke publik): alamat, tanggal lahir, status pernikahan, NIK, pekerjaan, penghasilan per bulan, jumlah tanggungan, rincian tanggungan.

### 3.9 Transparansi
- Counter publik: total dana terkumpul, dibuat semenarik mungkin secara visual.
- **Tidak ada** feed publik real-time berisi nama-nama yang baru saja berdonasi/membayar zakat.

### 3.10 Kontak
- Info kontak, tautan sosial media, alamat.

### 3.11 Cek Status Pembayaran & Riwayat Donasi

Dua alur terpisah, tujuannya beda:

**A. Cek Status Pembayaran (pakai kode pelacakan)**
- Halaman publik sederhana: input kode pelacakan (mis. `LZS-7F3K2Q`) → tampilkan status transaksi itu (Pending/Berhasil/Gagal), nominal, dan tujuan (campaign/zakat).
- Tidak butuh identitas lain — kode pelacakan sudah cukup, karena sifatnya seperti nomor resi.

**B. Cek Riwayat Transaksi (Fase 1: pakai email)**
- Halaman publik: input **email**. (Input nomor WA di halaman ini ditunda dulu — lihat catatan di bawah.)
- **Sistem TIDAK langsung menampilkan riwayatnya di layar.** Sistem mencari semua transaksi (Donasi + Zakat) milik `Donor` dengan email itu, lalu **mengirim daftar riwayatnya ke email yang dimasukkan** (lewat Resend, sama seperti pengiriman kode pelacakan).
- Alasan sengaja tidak ditampilkan langsung di layar: mencegah orang lain melihat riwayat donasi seseorang hanya dengan menebak/mengetik email milik orang itu. Karena riwayat dikirim ke saluran itu sendiri, hanya pemilik email asli yang bisa membacanya.
- Kalau email yang dimasukkan tidak ditemukan riwayatnya, tetap tampilkan pesan netral (mis. "Kalau email ini terdaftar, riwayat akan dikirimkan") — jangan konfirmasi/tolak secara eksplisit, supaya tidak bisa dipakai menebak email siapa saja yang pernah donasi.
- **Catatan Fase 1:** donatur yang cuma mengisi WA (tanpa email) saat donasi **belum bisa** pakai fitur Cek Riwayat, karena pengiriman lewat WA belum diaktifkan (lihat §7/§8). Mereka tetap bisa pakai Cek Status Pembayaran (§3.11.A) lewat kode pelacakan yang mereka catat sendiri. Input WA di fitur Cek Riwayat menyusul begitu channel WA diaktifkan.

## 4. Fitur Admin

### 4.1 Autentikasi
- Login lewat sistem Core (`users` + `module_access`), bukan sistem auth terpisah milik LAZSIP.
- Sidebar admin menampilkan menu LAZSIP hanya untuk akun yang punya `module_access` ke modul `lazsip`.

### 4.2 CRUD Konten
- **Berita** — judul, isi, gambar, status pin, status publish.
- **Campaign Donasi** — judul, deskripsi, target nominal, gambar, kode unik campaign, status pin, status aktif/selesai.
- **Program Pemberdayaan** — judul, deskripsi, syarat, gambar, kategori (umum/pendidikan/SARSIP), status pin, toggle buka/tutup pendaftaran.
- **Kegiatan** — judul, deskripsi, gambar, tanggal, status pin.
- **Penerima Manfaat (Penyaluran Bantuan)** — nama, alamat, masalah yang dihadapi, tanggal lahir, usia, jenis kelamin, cara mengetahui LAZSIP, foto, kebutuhan, tipe bantuan (kebutuhan pokok/pendidikan/kesehatan/lainnya), jumlah bantuan diterima, nama verifikator, wilayah cakupan verifikator, status pernikahan (menikah/janda-cerai/janda-meninggal/duda-cerai/duda-meninggal), NIK, pekerjaan, penghasilan per bulan, jumlah tanggungan, rincian tanggungan.
- **Mitra** — logo, nama, tautan.
- **Konten Umum** — hero, tentang, legalitas (editable tanpa perlu deploy ulang).
- **Referensi Biaya Payment** — tabel biaya admin per metode pembayaran, dipakai saat menghitung total tagihan donatur.

### 4.3 Kelola Donatur *(baru — dulu masih dummy)*
- Rekap **otomatis** dari transaksi yang berhasil `paid` — dicocokkan lewat nomor WA/email, bukan diinput manual (lihat logic upsert di §6).
- Tersegmentasi: donatur infaq/donasi vs muzakki (pembayar zakat) — satu donatur bisa masuk dua segmen sekaligus kalau pernah keduanya.
- Kolom yang tampil: nama, WA, email, total kontribusi, jumlah transaksi, transaksi terakhir.
- Bisa diurutkan berdasar: paling sering donasi ("donatur rajin"), total nominal terbesar ("donatur terbesar"), transaksi terbaru.
- Detail per donatur: riwayat lengkap semua transaksinya (donasi & zakat, semua status).

### 4.4 Kelola Transaksi *(baru — dulu masih dummy)*
- Daftar semua transaksi donasi & zakat: kode pelacakan, nominal, campaign/jenis, metode pembayaran, status (pending/paid/failed), donatur (link ke profil Donor), waktu.
- Selama payment gateway sungguhan belum terpasang: endpoint simulasi untuk menandai transaksi `paid`/`failed` secara manual (dipakai untuk testing alur Donatur & Transaksi tanpa menunggu keputusan gateway).

### 4.5 Kelola Pendaftar *(baru — dulu masih dummy)*
- Daftar pendaftar per Program Pemberdayaan dan per program pendidikan: nama, kontak, status pendaftaran (baru/diproses/diterima/ditolak).

### 4.6 Dashboard Overview
- Statistik ringkas: total donasi/zakat bulan berjalan, campaign paling banyak terkumpul, transaksi terbaru, jumlah pendaftar baru, jumlah donatur baru vs donatur lama (repeat).

## 5. Skema Data (`prisma/schema/lazsip.prisma`)

```
News            id, title, content, image, is_pinned, status, created_at

Campaign        id, title, description, target_amount, current_amount,
                image, unique_code, is_pinned, status

Donor           id, name, waNumber (unique, nullable), email (unique, nullable),
                type (infaq/zakat/keduanya — dihitung otomatis dari riwayat),
                totalContribution, createdAt
                // validasi aplikasi: waNumber dan email tidak boleh dua-duanya null

Donation        id, campaignId (FK Campaign), donorId (FK Donor),
                trackingCode (unique), amount, coversFee, isAnonymous,
                paymentMethod, status, createdAt

ZakatPayment    id, donorId (FK Donor), trackingCode (unique), amount,
                goldPriceSnapshot, paymentMethod, status, createdAt

Program         id, title, description, requirements, image, category
                (umum/pendidikan/sarsip), is_pinned, registration_open

ProgramApplicant id, program_id (FK), name, contact, status

Activity        id, title, description, image, date, is_pinned

Beneficiary     id, name, address, problem_faced, birth_date, age,
                gender, referral_source, photo, needs, aid_type,
                amount_received, verifier_name, verifier_area,
                marital_status, nik, occupation, monthly_income,
                dependents_count, dependents_detail

Partner         id, name, logo, url
SiteContent     id, section_key, content_json
PaymentFeeRef   id, method, fee_amount / fee_percentage
```

## 6. Aturan Bisnis Utama

1. Zakat dan donasi/infaq settle ke rekening yang berbeda — zakat ke rekening khusus, donasi/infaq semua campaign ke satu rekening bersama dengan kode unik pembeda.
2. Biaya admin payment gateway: opsi menanggung biaya tercentang **default**, donatur bisa memilih untuk tidak menanggungnya.
3. Status `paid` transaksi hanya diubah lewat webhook, tidak pernah dari sisi client/redirect saja.
4. Data sensitif penerima manfaat (alamat, tanggal lahir, status pernikahan, NIK, pekerjaan, penghasilan, tanggungan) tidak pernah diekspos lewat endpoint publik, di level query maupun response — bukan hanya disembunyikan di UI.
5. Program yang ditutup pendaftarannya tetap tampil (dengan status nonaktif), tidak dihapus dari listing publik.
6. **Identitas donatur wajib salah satu:** form Donasi & Zakat mewajibkan Nama, dan minimal salah satu dari Nomor WhatsApp/Email. Sebelum menyimpan transaksi, sistem melakukan **upsert** ke tabel `Donor`: kalau WA diisi → cari/cocokkan berdasar `waNumber`; kalau WA kosong tapi Email diisi → cocokkan berdasar `email`. Donatur yang sudah ada otomatis "nyambung" riwayatnya, donatur baru otomatis dibuat profilnya — tanpa donatur perlu membuat akun/password.
7. **Kode pelacakan (`trackingCode`)** dibuat otomatis dan unik untuk tiap `Donation`/`ZakatPayment`, ditampilkan ke donatur setelah submit, dipakai di fitur Cek Status Pembayaran (§3.11.A) tanpa perlu login.
8. **Fitur Cek Riwayat (§3.11.B) tidak pernah menampilkan data transaksi langsung di layar.** Riwayat selalu dikirim ke saluran (email, Fase 1) yang dimasukkan pengguna, dan sistem tidak mengonfirmasi/menolak secara eksplisit apakah email itu terdaftar — supaya tidak bisa dipakai untuk menebak siapa saja yang pernah berdonasi.
9. **Channel pengiriman Fase 1 adalah email saja (via Resend), bukan WhatsApp.** WA tetap jadi field identitas donatur yang sah dan tersimpan (dipakai admin untuk follow-up manual), tapi tidak dipakai sistem untuk mengirim kode pelacakan/riwayat secara otomatis sampai integrasi WA diputuskan (lihat §8). Ini keputusan final Fase 1, bukan asumsi sementara.

## 7. Kebutuhan Non-Fungsional

- Harga emas untuk kalkulator zakat diambil dari sumber eksternal dan di-cache (hindari rate limit/biaya API berlebihan dari pemanggilan berulang).
- Semua halaman admin dilindungi middleware Core (redirect ke login bila sesi tidak valid atau tidak punya akses ke modul `lazsip`).
- Tampilan responsif (mobile-first, karena traffic donasi besar kemungkinan datang dari mobile/WhatsApp).
- Upload gambar (berita, campaign, program, kegiatan, foto penerima manfaat) tersimpan di storage yang konsisten dengan strategi platform (bukan disk lokal server).
- **Dependency baru (final, Fase 1): integrasi email via Resend** (free tier: 3.000 email/bulan, batas 100 email/hari, 1 domain terverifikasi) untuk kirim kode pelacakan dan Cek Riwayat (§3.11). Batas 100/hari perlu dipantau — kalau suatu hari transaksi melonjak (mis. campaign bencana viral) dan lewat batas, pengiriman email ter-pause sampai hari berikutnya; kode pelacakan tetap aman karena selalu ditampilkan di layar juga (bukan cuma lewat email).
- Integrasi WhatsApp untuk channel yang sama **ditunda**, bukan dibatalkan — jadi peningkatan Fase berikutnya (lihat §8).
- Rate limiting pada endpoint Cek Status & Cek Riwayat (§3.11) — mencegah orang mencoba banyak kode/email secara brute-force.

## 8. Pertanyaan Terbuka

- Payment gateway final belum diputuskan — sampai diputuskan, alur pembayaran berjalan dengan mode simulasi (tandai manual paid/failed).
- Sumber data harga emas real-time yang dipakai — perlu dikonfirmasi (API mana, biaya, rate limit).
- Provider pengiriman WhatsApp untuk kode pelacakan & Cek Riwayat — **ditunda ke fase berikutnya** (bukan dikerjakan di Fase 1). Kalau nanti dibutuhkan, opsinya: provider lokal berbayar-murah (Fonnte/Wablas/sejenis, tidak resmi tapi praktis) atau self-host library open-source (Baileys, gratis tapi berisiko nomor diblokir & perlu server nyala terus) — dan sebaiknya pakai nomor WA terpisah dari nomor kontak utama LAZSIP untuk kurangi risiko.
- Apakah "Blog"/"Berita" LAZSIP ini nanti tetap terpisah dari "Blog SIP" di modul induk, atau digabung — didiskusikan lagi saat Fase 2 (Modul SIP) dikerjakan.

## 9. Definition of Done

- Seluruh fitur publik di atas berjalan menggunakan data nyata dari database (tidak ada dummy data tersisa).
- Seluruh fitur admin di atas berjalan, termasuk tiga yang sebelumnya dummy (Donatur, Transaksi, Pendaftar).
- Login & kontrol akses admin memakai sistem Core, bukan auth terpisah.
- Tidak ada endpoint yang membocorkan field privat penerima manfaat lewat API publik.
- Form Donasi/Zakat memvalidasi Nama wajib + minimal salah satu WA/Email, dan logic upsert ke `Donor` berjalan benar (transaksi dengan WA/email yang sama otomatis tergabung ke satu profil donatur).
- Kode pelacakan otomatis ter-generate unik tiap transaksi, ditampilkan di layar, dan (kalau email diisi) terkirim ke email lewat Resend. Halaman Cek Status Pembayaran berfungsi untuk semua donatur (cukup modal kode pelacakan).
- Fitur Cek Riwayat berfungsi untuk email (mengirim data lewat email, bukan menampilkan langsung di layar), dan tidak membocorkan status terdaftar/tidaknya suatu email. Input WA di fitur ini boleh belum ada di Fase 1.
- Modul mengikuti struktur folder standar platform, siap dijadikan acuan pola untuk modul-modul berikutnya.

## 10. Design Pattern — Admin Dashboard

Desain ulang tampilan admin dashboard modul LAZSIP mengikuti brief berikut.

REFERENSI LAYOUT
Pakai struktur dari gambar referensi dashboard "CoachPro" (sidebar kiri,
topbar dengan sapaan + search + notifikasi + avatar, grid kartu statistik,
kartu promo/CTA di pojok kanan bawah, floating action button) — tapi
di-restyle total pakai identitas warna LAZSIP di bawah, jangan pakai warna
biru-ungu gradient dari referensinya.

COLOR TOKENS
- primary: #F79633 (oranye — dari logo LAZSIP, dipakai untuk CTA utama,
  active state, highlight angka penting)
- secondary: #73AE43 (hijau — dari logo LAZSIP, dipakai untuk status
  positif/selesai, ikon sekunder, aksen)
- ink: #5D5D5D (abu gelap — teks utama, dari warna tagline logo)
- surface: #FFFFFF dan satu abu sangat muda #F7F7F5 untuk background
  section, HINDARI gradient biru/ungu ala referensi
- border/shadow: soft, tapi jangan pakai satu shadow generik yang sama
  persis di semua kartu — beri variasi tipis sesuai hirarki (kartu
  ringkasan lebih menonjol dari kartu daftar)

TYPE
- Satu typeface sans untuk semua (headline & body), jangan pakai dua
  font berbeda tanpa alasan
- Angka statistik besar (mis. total donasi bulan ini) pakai bobot bold,
  ukuran jelas lebih besar dari label di sampingnya

LAYOUT
- Sidebar kiri: logo LAZSIP di atas, menu (Dashboard, Donasi, Zakat,
  Program, Kegiatan, Penyaluran Bantuan, Berita, Donatur, Transaksi,
  Pendaftar, Pengaturan), item aktif pakai background pill oranye
  (bukan hijau — oranye lebih dominan di logo, jadi jadi warna aksi
  utama, hijau untuk status/sekunder)
- Topbar: "Selamat datang, [nama admin]", search, notifikasi, avatar
- Konten utama: baris ringkasan (total donasi, total zakat bulan ini,
  jumlah donatur baru, campaign paling laris) sebagai kartu statistik
  dengan ikon chip warna oranye/hijau bergantian
- Kartu "campaign donasi teraktif" dengan progress bar warna oranye
- Satu kartu highlight (mis. "Transaksi menunggu verifikasi" atau
  "Program hampir tutup pendaftaran") ditempatkan menonjol, bukan
  sekadar kartu promo generik seperti "setup training" di referensi —
  isinya harus benar-benar actionable buat admin LAZSIP hari itu

PRINCIPLES
- Rasa yang mau dicapai: hangat dan terpercaya (karena ini dashboard
  pengelola dana zakat/donasi publik), bukan dashboard korporat generik
  bertema fintech
- Satu elemen pembeda: gunakan bentuk daun/tangan dari ikon logo
  LAZSIP sebagai motif tipis (watermark sangat halus atau bentuk
  pemisah section), supaya dashboard-nya terasa "milik LAZSIP", bukan
  template SaaS yang di-recolor doang
- Responsive sampai mobile, kontras warna cukup untuk keterbacaan
  (terutama oranye di atas putih — cek kontrasnya)