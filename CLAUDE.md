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
- **Satu modul = satu folder mandiri, pola ala Laravel Modules (nwidart/laravel-modules), versi Next.js.** Semua yang dipunyai satu modul (halaman publik, halaman admin, endpoint API, komponen, service logic, schema Prisma) hidup dalam SATU folder `modules/<modul>/` — bukan tersebar per-tipe-file di top level. Jangan pernah menaruh kode satu modul di folder modul lain, dan jangan mengedit folder modul lain saat sedang mengerjakan modul tertentu, kecuali memang diminta eksplisit. Lihat §4 untuk struktur persisnya dan alasan kenapa `app/` tetap ada (keterbatasan Next.js App Router).
- **Satu database bersama, tabel terpisah per modul** lewat file schema Prisma yang co-located di dalam folder modul masing-masing (lihat §5). Modul boleh mereferensi tabel Core (`users`) bila perlu, tapi hindari modul saling mereferensi tabel modul lain kecuali benar-benar diperlukan dan didiskusikan dulu.
- **Auth terpusat.** Semua modul memakai sistem login & otorisasi Core (`users` + `module_access` + `is_superadmin`) — jangan membuat sistem auth terpisah per modul.

## 4. Struktur Folder Standar

Next.js App Router **mewajibkan** route (`page.tsx`, `layout.tsx`, `route.ts`) fisik berada di dalam `app/` supaya bisa ter-resolve jadi URL — beda dengan Laravel yang bebas menaruh route di folder mana saja karena registrasi lewat service provider. Jadi pola kita: **isi/logic modul 100% ada di `modules/<modul>/`, dan `app/` cuma berisi file "jembatan" satu baris** yang re-export dari sana. Ini yang paling dekat dengan filosofi Laravel Modules (satu folder = satu modul lengkap) yang bisa dicapai di Next.js.

```
modules/<modul>/
├── module.json               metadata modul (name, deskripsi, versi)
├── schema.prisma              tabel database modul ini (co-located, bukan di prisma/schema/)
├── api/                        service logic + route handler asli
│   ├── <resource>.ts           business logic murni (query Prisma, aturan bisnis)
│   └── routes/<resource>/route.ts   isi asli endpoint (GET/POST/dst), di-re-export oleh app/api/<modul>/**
├── components/                 semua komponen UI modul ini (ui/, sections/, admin/, dst)
├── pages/                      isi asli halaman publik, di-re-export oleh app/(public)/<modul>/**
└── admin/pages/                isi asli halaman admin, di-re-export oleh app/admin/<modul>/**

app/
├── (public)/<modul>/**/page.tsx   HANYA: export { default } from "@/modules/<modul>/pages/**/page";
├── admin/<modul>/**/page.tsx      HANYA: export { default } from "@/modules/<modul>/admin/pages/**/page";
├── admin/super/                    khusus superadmin (kelola akun & akses modul, Core saja — bukan modul)
└── api/<modul>/**/route.ts        HANYA: export * from "@/modules/<modul>/api/routes/**/route";

components/ui/                 komponen umum lintas modul (button, card, modal, table, form field)
components/admin-shell/         layout & sidebar dashboard admin (Core, dipakai semua modul)

prisma/schema/core.prisma       users, modules, module_access — punya Core/framework, BUKAN modul, tetap di prisma/schema/
proxy.ts                        proteksi route /admin/** — cek sesi & module_access
```

**Contoh konkret** (lihat implementasi nyata di `modules/lazsip/` sebagai referensi pola untuk SARSIP dkk):
- Isi halaman `/lazsip/donasi` ada di `modules/lazsip/pages/donasi/page.tsx`; `app/(public)/lazsip/donasi/page.tsx` cuma `export { default } from "@/modules/lazsip/pages/donasi/page";`.
- Isi endpoint `POST /api/lazsip/news` ada di `modules/lazsip/api/routes/news/route.ts`; `app/api/lazsip/news/route.ts` cuma `export * from "@/modules/lazsip/api/routes/news/route";`.
- Service function dipanggil dari route handler ada di `modules/lazsip/api/news.ts` (bukan di `routes/`), supaya logic tetap bisa dipanggil dari tempat lain (misal dari `admin/pages/` untuk data fetching server component) tanpa lewat HTTP.
- Komponen dipanggil sebagai `@/modules/lazsip/components/Navbar`, dst.

Saat mengerjakan modul `lazsip`, semua kode baru masuk ke dalam `modules/lazsip/` sesuai sub-folder di atas — jangan bikin file baru langsung di `app/(public)/lazsip/`, `app/admin/lazsip/`, atau `app/api/lazsip/` selain file jembatan satu baris. Kalau butuh komponen umum (button, card generik), taruh/pakai dari `components/ui/`, bukan duplikat di dalam folder modul.

## 5. Skema Data — Konvensi

- Satu file `schema.prisma` per modul, **co-located di `modules/<modul>/schema.prisma`** (bukan di `prisma/schema/`) — hanya `core.prisma` yang tetap di `prisma/schema/` karena itu punya framework, bukan modul. Prisma otomatis men-scan seluruh project (lihat `schema: "."` di `prisma.config.ts`) dan menggabung semua `*.prisma` yang ketemu jadi satu namespace, termasuk yang co-located di dalam `modules/`.
- Nama model pakai PascalCase (`Campaign`, `Beneficiary`), nama field pakai camelCase.
- Karena semua schema digabung jadi satu namespace model global, nama model **harus diprefix nama modul** kalau entitasnya generik dan berpotensi dipakai modul lain juga (mis. `LazsipNews`/`SarsipNews`, `LazsipPartner`, bukan `News`/`Partner` polos) — supaya tidak tabrakan saat modul lain dikerjakan. Nama tabel fisik (`@@map`) ikut diprefix juga (`lazsip_news`).
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

Kalau diminta menambah modul baru (mis. Zakat Academy), ikuti langkah ini — **satu folder `modules/<modul-baru>/` untuk semuanya**, persis pola `modules/lazsip/` yang sudah jadi referensi (lihat §4). **Jangan mengubah kode modul yang sudah ada:**

1. Buat `modules/<modul-baru>/module.json` (metadata: name, description, version).
2. Buat `modules/<modul-baru>/schema.prisma` — model diprefix nama modul (lihat §5).
3. Jalankan migration (schema baru otomatis ketemu karena `schema: "."` di `prisma.config.ts`).
4. Buat `modules/<modul-baru>/api/<resource>.ts` untuk business logic, dan `modules/<modul-baru>/api/routes/<resource>/route.ts` untuk isi endpoint asli.
5. Buat `modules/<modul-baru>/components/` untuk semua komponen UI modul ini.
6. Buat `modules/<modul-baru>/pages/` (halaman publik) dan `modules/<modul-baru>/admin/pages/` (halaman admin).
7. Di `app/`, buat file jembatan satu baris di path yang sesuai (`app/(public)/<modul-baru>/**/page.tsx`, `app/admin/<modul-baru>/**/page.tsx`, `app/api/<modul-baru>/**/route.ts`) yang isinya cuma `export { default } from "@/modules/<modul-baru>/..."` (untuk page/layout) atau `export * from "@/modules/<modul-baru>/..."` (untuk route.ts).
8. Tambahkan satu baris modul baru ke tabel `modules` (lewat panel `/admin/super/modul` atau seed).
9. Modul lama tidak perlu di-build ulang logicnya — cukup ikut ter-bundle ulang saat deploy karena satu aplikasi.

## 9. Yang Harus Dihindari

- Jangan bikin backend/server terpisah (Go, Express, dsb) — semua logic backend masuk `app/api/` di aplikasi Next.js yang sama.
- Jangan bikin sistem login/JWT sendiri per modul.
- Jangan hardcode kredensial, API key, atau connection string — selalu lewat environment variable.
- Jangan hapus atau modifikasi `modules/<modul lain>/schema.prisma` saat mengerjakan modul yang sedang difokuskan.
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
- [ ] Mengikuti struktur folder §4 — semua logic ada di dalam `modules/<modul>/`, `app/` cuma berisi file jembatan satu baris, tidak ada file "nyasar" ke folder modul lain.
- [ ] Sesuai *Definition of Done* di PRD modul terkait sebelum ditandai selesai.