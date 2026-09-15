# CLAUDE.md

Instruksi ini dibaca otomatis oleh Claude Code setiap sesi dimulai di project ini. Tujuannya supaya Claude Code langsung paham arsitektur, aturan, dan prioritas kerja tanpa perlu dijelaskan ulang tiap kali.

## 1. Apa project ini

Platform digital terpadu untuk **Solidaritas Insan Peduli (SIP)** — yayasan dengan beberapa divisi/program yang sebelumnya berjalan sebagai website dan sistem terpisah-pisah (WordPress, Next.js, Go, Laravel). Project ini menyatukan semuanya jadi **satu aplikasi, satu database, satu deploy**, dengan modul-modul (LAZSIP, SARSIP, Divisi Pendidikan, Tanwir Qurani, dan SIP sendiri) sebagai bagian sejajar di dalamnya.

Dokumen lengkap ada di:
- `PRD.md` — arsitektur keseluruhan, skema data inti, roadmap semua fase.
- `prd-lazsip.md` — spesifikasi detail modul LAZSIP (fase yang sedang dikerjakan sekarang).
- File `prd-<modul>.md` lain akan menyusul seiring modul itu mulai dikerjakan.

**Baca `PRD.md` dan PRD modul yang relevan sebelum mulai kerja di area itu.** Jangan berasumsi soal fitur/aturan bisnis yang belum dibaca dari PRD-nya.

## 2. Prioritas kerja saat ini

**Sedang dikerjakan: Modul LAZSIP (Fase 1).** Semua modul lain (SIP, SARSIP, Pendidikan, Tanwir Qurani) belum dikerjakan — jangan bangun fiturnya duluan kecuali diminta eksplisit. Fokus penuh menyelesaikan LAZSIP sampai memenuhi *Definition of Done* di `prd-lazsip.md` sebelum pindah ke modul berikutnya.

## 3. Prinsip Arsitektur (wajib dipatuhi)

- **Modular monolith, bukan microservices.** Satu aplikasi Next.js (App Router), satu proses, satu database MySQL. Tidak ada backend terpisah per modul.
- **Modul bersifat flat/sejajar.** SIP, LAZSIP, SARSIP, Pendidikan, Tanwir Qurani semuanya setara — tidak ada modul yang jadi "induk" dari modul lain.
- **Satu modul = satu set folder terisolasi.** Jangan pernah menaruh kode satu modul di folder modul lain, dan jangan mengedit folder modul lain saat sedang mengerjakan modul tertentu, kecuali memang diminta eksplisit.
- **Satu database bersama, tabel terpisah per modul** lewat file schema Prisma per modul (lihat §5). Modul boleh mereferensi tabel Core (`users`) bila perlu, tapi hindari modul saling mereferensi tabel modul lain kecuali benar-benar diperlukan dan didiskusikan dulu.
- **Auth terpusat.** Semua modul memakai sistem login & otorisasi Core (`users` + `module_access` + `is_superadmin`) — jangan membuat sistem auth terpisah per modul.

## 4. Struktur Folder Standar

```
app/
├── (public)/<modul>/        halaman publik modul ini
├── admin/<modul>/            halaman admin modul ini
├── admin/super/               khusus superadmin (kelola akun & akses modul, Core saja)
└── api/<modul>/               endpoint modul ini (pengganti backend terpisah)

modules/<modul>/               business logic murni (service functions), dipanggil dari app/api
components/<modul>/            komponen UI modul ini
components/ui/                 komponen umum lintas modul (button, card, modal, table, form field)
components/admin-shell/         layout & sidebar dashboard admin (Core, dipakai semua modul)

prisma/schema/<modul>.prisma    tabel database modul ini
prisma/schema/core.prisma       users, modules, module_access

middleware.ts                   proteksi route /admin/** — cek sesi & module_access
```

Saat mengerjakan modul `lazsip`, semua kode baru masuk ke `app/(public)/lazsip/`, `app/admin/lazsip/`, `app/api/lazsip/`, `modules/lazsip/`, `components/lazsip/`, `prisma/schema/lazsip.prisma`. Kalau butuh komponen umum (button, card generik), taruh/pakai dari `components/ui/`, bukan duplikat di dalam folder modul.

## 5. Skema Data — Konvensi

- Satu file Prisma per modul di `prisma/schema/<modul>.prisma`, digabung otomatis saat build (multi-file schema Prisma).
- Nama model pakai PascalCase (`Campaign`, `Beneficiary`), nama field pakai camelCase.
- Karena semua file `prisma/schema/*.prisma` digabung jadi satu namespace model global, nama model **harus diprefix nama modul** kalau entitasnya generik dan berpotensi dipakai modul lain juga (mis. `LazsipNews`/`SarsipNews`, `LazsipPartner`, bukan `News`/`Partner` polos) — supaya tidak tabrakan saat modul lain dikerjakan. Nama tabel fisik (`@@map`) ikut diprefix juga (`lazsip_news`).
- Field privat/sensitif (lihat aturan privasi di PRD modul terkait) **tidak boleh** ikut ter-select di query yang dipakai endpoint publik — filter di level query (`select`), bukan cuma disembunyikan di UI.
- Migration baru untuk modul tertentu tidak boleh mengubah/menghapus tabel modul lain.

## 6. Konvensi Kode

- Bahasa kode (variabel, fungsi, nama file, nama komponen): **Inggris**.
- Slug/URL rute publik & label yang tampil ke pengguna: **Bahasa Indonesia** (mengikuti konten aslinya, mis. `/lazsip/donasi`, `/lazsip/penyaluran-bantuan`).
- Komentar kode boleh Bahasa Indonesia bila menjelaskan aturan bisnis lokal yang spesifik (mis. aturan zakat, privasi data penerima manfaat) — supaya konteksnya jelas buat tim non-teknis yang membaca.
- TypeScript strict — hindari `any` kecuali benar-benar tidak terhindarkan, dan beri komentar alasannya.
- Komponen React: functional component + hooks, ikuti pola yang sudah ada di komponen hasil migrasi dari `lazsiplp`/`sarsiplp` (reuse gaya yang sudah ada, jangan bikin pola baru tanpa alasan).

## 7. Aturan Bisnis Kritis — Jangan Dilanggar

Ini aturan yang **wajib dijaga** di kode manapun yang menyentuhnya, karena kalau salah dampaknya ke uang/privasi orang sungguhan:

1. **Status transaksi `paid` hanya boleh diubah lewat webhook payment gateway** (atau endpoint simulasi khusus admin selama gateway belum ada) — tidak boleh dari sisi client/redirect sukses saja.
2. **Data sensitif penerima manfaat** (alamat, tanggal lahir, status pernikahan) tidak boleh pernah ikut di response endpoint publik manapun.
3. **Zakat dan donasi/infaq settle ke rekening berbeda** — jangan disatukan logikanya.
4. **Checkbox "tanggung biaya admin" default tercentang** pada form donasi — bukan default kosong.
5. Field/tabel privat (kolom internal, log sensitif) tidak boleh diekspos lewat endpoint yang dipanggil halaman publik.

Kalau ragu apakah sebuah field/endpoint termasuk sensitif, cek dulu ke PRD modul terkait sebelum menulis kode — jangan asumsi sendiri.

## 8. Menambah Modul Baru (pola baku)

Kalau diminta menambah modul baru (mis. Zakat Academy), ikuti langkah ini, **jangan mengubah kode modul yang sudah ada**:

1. Buat `prisma/schema/<modul-baru>.prisma`.
2. Jalankan migration.
3. Buat `modules/<modul-baru>/` untuk logic-nya.
4. Buat `app/api/<modul-baru>/` untuk endpoint.
5. Buat `components/<modul-baru>/` untuk tampilan.
6. Buat `app/(public)/<modul-baru>/` dan `app/admin/<modul-baru>/` untuk halaman.
7. Tambahkan satu baris modul baru ke tabel `modules` (lewat panel `/admin/super/modul` atau seed).
8. Modul lama tidak perlu di-build ulang logicnya — cukup ikut ter-bundle ulang saat deploy karena satu aplikasi.

## 9. Yang Harus Dihindari

- Jangan bikin backend/server terpisah (Go, Express, dsb) — semua logic backend masuk `app/api/` di aplikasi Next.js yang sama.
- Jangan bikin sistem login/JWT sendiri per modul.
- Jangan hardcode kredensial, API key, atau connection string — selalu lewat environment variable.
- Jangan hapus atau modifikasi `prisma/schema/<modul lain>.prisma` saat mengerjakan modul yang sedang difokuskan.
- Jangan asumsikan payment gateway sudah final — ikuti mode simulasi sampai ada keputusan (lihat `prd-lazsip.md` §8).
- Jangan gunakan `localStorage`/`sessionStorage` untuk data yang seharusnya persisten di database.

## 10. Riwayat & Sumber Referensi

- `lazsiplp` (github.com/aslammghifar/lazsiplp) — repo lama LAZSIP, sumber referensi tampilan (komponen React) dan sebagian aturan bisnis (backend Go-nya). Bukan sumber kode yang dipanggil langsung — hanya referensi saat menulis ulang.
- `sarsiplp` (github.com/aslammghifar/sarsiplp) — repo lama SARSIP, referensi untuk Fase 3.
- `tanwir-qurani` (github.com/djofan/tanwir-qurani) — repo lama Tanwir Qurani (Laravel/Filament), referensi fitur untuk Fase 5.
- `insanpeduli.org` — website lama SIP, referensi konten/fitur untuk Fase 2.

## 11. Checklist Sebelum Menganggap Sebuah Fitur Selesai

- [ ] Data nyata dari database, tidak ada dummy/mock tersisa di kode yang di-commit.
- [ ] Route publik tidak mengekspos field privat (cek §7).
- [ ] Halaman admin diproteksi middleware Core, cek `module_access`.
- [ ] Mengikuti struktur folder §4 — tidak ada file "nyasar" ke folder modul lain.
- [ ] Sesuai *Definition of Done* di PRD modul terkait sebelum ditandai selesai.