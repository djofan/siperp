# CLAUDE.md

Instruksi ini dibaca otomatis oleh Claude Code setiap sesi dimulai di project ini. Tujuannya supaya Claude Code langsung paham arsitektur, aturan, dan prioritas kerja tanpa perlu dijelaskan ulang tiap kali.

## 1. Apa project ini

Platform digital terpadu untuk **Solidaritas Insan Peduli (SIP)** — yayasan dengan beberapa divisi/program yang sebelumnya berjalan sebagai website dan sistem terpisah-pisah (WordPress, Next.js, Go, Laravel). Project ini menyatukan semuanya jadi **satu platform: satu repo, satu database, satu sistem login**, dengan modul-modul (LAZSIP, SARSIP, Divisi Pendidikan, Tanwir Qurani, Ojol Mengaji, dan SIP sendiri) sebagai bagian sejajar di dalamnya.

**Arsitektur target: frontend Next.js + backend Laravel (API REST) + satu database MySQL.**

- **Frontend** = Next.js (App Router, TypeScript) di root repo.
- **Backend** = Laravel 13 di folder `api/`, mengekspos API REST `/api/v1/<modul>`.
- **Status transisi (14 Oktober 2026):** fondasi Laravel sudah ada (kerangka sembilan modul, auth Sanctum, konvensi REST, kontrak OpenAPI), tetapi **belum ada modul bisnis yang dimigrasikan**. Selama sebuah modul belum dimigrasikan, backend modul itu **tetap di Next.js** (`modules/<modul>/api/` + `app/api/<modul>/`). Migrasi dilakukan bertahap per modul (pola *strangler*), bukan sekaligus.

Dokumen lengkap ada di folder `docs/`:
- **`docs/arsitektur.md` — sumber kebenaran tunggal arsitektur Next.js + Laravel: pembagian tanggung jawab, alur auth, batas frontend/backend, strategi migrasi, status migrasi per modul, keputusan yang masih terbuka. Baca ini dulu.**
- `docs/PRD.md` — latar belakang produk, skema data inti, roadmap semua fase (ringkasan lintas modul).
- `docs/prd-core.md`, `docs/prd-lazsip.md`, `docs/prd-sip.md`, `docs/prd-tanwir.md`, `docs/prd-ojol.md` — spesifikasi detail per modul. PRD modul adalah acuan utama untuk aturan bisnis modul itu.
- `api/README.md`, `api/docs/CONVENTIONS.md`, `api/docs/openapi.json` — setup, konvensi REST, dan kontrak API sisi Laravel.
- File `docs/prd-<modul>.md` lain dibuat **sebelum** modul itu mulai dikerjakan.

**Baca `docs/arsitektur.md` dan PRD modul yang relevan sebelum mulai kerja di area itu.** Jangan berasumsi soal fitur/aturan bisnis yang belum dibaca dari PRD-nya.

## 2. Prioritas kerja saat ini

Status per 14 Oktober 2026:

| Modul | Status fitur | Backend saat ini | Acuan |
|---|---|---|---|
| Core (auth, akun, akses modul) | Berjalan | Next.js — **berikutnya dimigrasikan ke Laravel** | `docs/prd-core.md` |
| LAZSIP | Berjalan, penyempurnaan | Next.js | `docs/prd-lazsip.md` |
| SIP (portal induk, di root `/`) | Berjalan | Next.js | `docs/prd-sip.md` |
| SARSIP, Academy | Berjalan (dikerjakan tim) | Next.js | — |
| Payment | Ada di repo (hub pembayaran lintas divisi) | Next.js | `docs/midtrans-sandbox.md`, `docs/payment-emails.md` |
| Tanwir Qurani | Dibangun & diuji, mulai dari nol (tanpa migrasi data lama) | Next.js | `docs/prd-tanwir.md`, `docs/tanwir-demo.md` |
| Ojol Mengaji | Dibangun & diuji, mulai dari nol (tanpa migrasi data lama) | Next.js | `docs/prd-ojol.md`, `docs/ojol-demo.md` |
| Teknisi | Ada di repo | Next.js | `modules/teknisi/README.md` |
| Divisi Pendidikan | Belum dimulai, scope belum jelas | — | `docs/PRD.md` Fase 4 |
| **Laravel API (fondasi)** | **Fondasi selesai, belum ada modul bisnis** | Laravel | `api/README.md`, `docs/arsitektur.md` |

Jangan membangun fitur modul yang belum dimulai kecuali diminta eksplisit. Selesaikan modul yang sedang dikerjakan sampai memenuhi *Definition of Done* di PRD-nya sebelum pindah ke modul berikutnya. **Jangan memigrasikan modul ke Laravel kecuali diminta eksplisit** — urutan migrasi diatur di `docs/arsitektur.md` §7.

## 3. Prinsip Arsitektur (wajib dipatuhi)

- **Modular monolith di kedua sisi, bukan microservices.** Satu aplikasi Next.js (frontend), satu aplikasi Laravel (backend API), satu database MySQL. Tidak ada backend terpisah per modul.
- **Batas frontend–backend.** Untuk modul yang sudah dimigrasikan, Next.js **tidak** mengakses database/Prisma untuk modul itu; ia memanggil API Laravel **dari server** (Server Components/Actions) dengan `Authorization: Bearer <token>`. Token disimpan di cookie HttpOnly dan **tidak boleh** terbuka ke JavaScript browser, log, atau props komponen yang diserialisasi. Tidak ada request browser → Laravel langsung.
- **Modul bersifat flat/sejajar.** SIP, LAZSIP, SARSIP, Pendidikan, Tanwir Qurani, Ojol Mengaji semuanya setara — tidak ada modul yang jadi "induk" dari modul lain.
- **Satu modul = dua sisi yang sejajar.** Sisi frontend hidup di `modules/<modul>/` (Next.js), sisi backend di `api/app/Modules/<Modul>/` (Laravel). Jangan pernah menaruh kode satu modul di folder modul lain, dan jangan mengedit folder modul lain saat sedang mengerjakan modul tertentu, kecuali memang diminta eksplisit. Kerja lintas modul di Laravel lewat service/event yang eksplisit, **bukan** memanggil controller modul lain.
- **Satu database bersama, tabel terpisah per modul.** Saat ini tabel dan migration yang ada **dimiliki Prisma (Next.js)**; Laravel hanya menambah migration `personal_access_tokens`. Siapa yang memegang migration jangka panjang **belum diputuskan** (lihat `docs/arsitektur.md` §6) — sampai diputuskan, **jangan** menjalankan `migrate:fresh`, `migrate:refresh`, atau `db:wipe`, dan jangan membuat migration Laravel yang mengubah tabel bisnis.
- **Auth terpusat.** Semua modul memakai sistem login & otorisasi Core (`users` + `module_access` + `is_superadmin`). Sisi Laravel memakai Sanctum personal access token (kedaluwarsa absolut 7 hari); jangan membuat sistem auth/JWT terpisah per modul.
- **Migrasi bertahap (strangler).** Modul dimigrasikan satu per satu. Modul yang belum dimigrasikan tetap berjalan penuh di Next.js dan tidak boleh rusak karena pekerjaan di `api/`.

## 4. Struktur Folder Standar

### 4.1 Frontend (Next.js)

Next.js App Router **mewajibkan** route (`page.tsx`, `layout.tsx`, `route.ts`) fisik berada di dalam `app/` supaya bisa ter-resolve jadi URL — beda dengan Laravel yang bebas menaruh route di folder mana saja karena registrasi lewat service provider. Jadi pola kita: **isi/logic frontend modul 100% ada di `modules/<modul>/`, dan `app/` cuma berisi file "jembatan" satu baris** yang re-export dari sana.

```
modules/<modul>/
├── module.json               metadata modul (name, deskripsi, versi)
├── schema.prisma              tabel database modul ini (co-located, bukan di prisma/schema/)
├── api/                        [HANYA modul yang belum dimigrasikan] service logic + route handler Next.js
│   ├── <resource>.ts           business logic murni (query Prisma, aturan bisnis)
│   └── routes/<resource>/route.ts   isi asli endpoint, di-re-export oleh app/api/<modul>/**
├── components/                 semua komponen UI modul ini (ui/, sections/, admin/, dst)
├── pages/                      isi asli halaman publik, di-re-export oleh app/(public)/<modul>/**
└── admin/pages/                isi asli halaman admin, di-re-export oleh app/admin/<modul>/**

app/
├── (public)/<modul>/**/page.tsx   HANYA: export { default } from "@/modules/<modul>/pages/**/page";
├── admin/<modul>/**/page.tsx      HANYA: export { default } from "@/modules/<modul>/admin/pages/**/page";
├── admin/super/                    khusus superadmin (kelola akun & akses modul, Core saja — bukan modul)
└── api/<modul>/**/route.ts        HANYA: export * from "@/modules/<modul>/api/routes/**/route";  [modul yang belum dimigrasikan]

components/ui/                 komponen umum lintas modul (button, card, modal, table, form field)
components/admin-shell/         layout & sidebar dashboard admin (Core, dipakai semua modul)

prisma/schema/core.prisma       users, modules, module_access — punya Core/framework, BUKAN modul, tetap di prisma/schema/
proxy.ts                        proteksi route /admin/** — cek sesi & module_access
```

**Contoh konkret** (implementasi nyata di `modules/lazsip/`, referensi pola untuk modul lain):
- Isi halaman `/lazsip/donasi` ada di `modules/lazsip/pages/donasi/page.tsx`; `app/(public)/lazsip/donasi/page.tsx` cuma `export { default } from "@/modules/lazsip/pages/donasi/page";`.
- Isi endpoint `POST /api/lazsip/news` (masih di Next.js) ada di `modules/lazsip/api/routes/news/route.ts`; `app/api/lazsip/news/route.ts` cuma `export * from "@/modules/lazsip/api/routes/news/route";`.
- Service function dipanggil dari route handler ada di `modules/lazsip/api/news.ts` (bukan di `routes/`), supaya logic tetap bisa dipanggil dari server component tanpa lewat HTTP.
- Komponen dipanggil sebagai `@/modules/lazsip/components/Navbar`, dst.

**Pengecualian file jembatan: route segment config.** Next hanya membaca pengaturan rute (`dynamic`, `revalidate`, `runtime`, `maxDuration`, dst) yang tertulis **literal di file `app/` itu sendiri**; flag yang hanya ada di file modul tidak terlihat lewat `export { default } from ...`. Layout/halaman yang membaca database saat render wajib punya `export const dynamic = "force-dynamic";` di file jembatannya, kalau tidak halaman itu diprerender saat `next build` dan build gagal bila database tidak terjangkau. Contoh:

```ts
// app/(public)/lazsip/layout.tsx
export { default } from "@/modules/lazsip/pages/layout";
export const dynamic = "force-dynamic";
```

Saat mengerjakan sisi frontend modul `lazsip`, semua kode baru masuk ke `modules/lazsip/` sesuai sub-folder di atas — jangan bikin file baru langsung di `app/(public)/lazsip/`, `app/admin/lazsip/`, atau `app/api/lazsip/` selain file jembatan satu baris. Komponen umum (button, card generik) dipakai dari `components/ui/`, bukan diduplikat di folder modul.

**Setelah sebuah modul dimigrasikan ke Laravel:** `modules/<modul>/api/` dan `app/api/<modul>/` untuk modul itu digantikan oleh pemanggilan API Laravel. Bentuk klien API di Next.js (folder dan helper-nya) **diputuskan saat modul Core dimigrasikan** dan akan dicatat di `docs/arsitektur.md` §7 — jangan mengarang pola sendiri sebelum itu.

### 4.2 Backend (Laravel, folder `api/`)

```
api/
├── app/
│   ├── Modules/<Modul>/
│   │   ├── Http/Controllers/      controller tipis, hanya orkestrasi
│   │   ├── Http/Requests/         validasi (Form Request)
│   │   ├── Http/Resources/        bentuk respons (API Resource) — pilih field secara eksplisit
│   │   ├── Models/                Eloquent model (tabel yang dimiliki modul ini)
│   │   ├── Policies/              otorisasi
│   │   ├── Events/ Listeners/     komunikasi lintas modul
│   │   ├── Providers/<Modul>ServiceProvider.php   binding, route, policy, listener
│   │   └── routes/api.php         prefix otomatis /api/v1/<modul>
│   ├── Http/ ...                  komponen bersama (CollectionRequest, ErrorResource, middleware)
│   └── Support/HasPrismaCuid.php  trait ID CUID v1 untuk model yang menulis tabel milik Prisma
├── config/modules.php             daftar provider modul (Core, Payment, Lazsip, Sip, Academy, Sarsip, Tanwir, Ojol, Teknisi)
├── docs/CONVENTIONS.md            konvensi REST — wajib diikuti semua modul
├── docs/openapi.json              kontrak API aktif
└── tests/                         Pest (Feature test, fixture)
```

Provider modul sudah memasang prefix `api/v1/<modul>` dan middleware `api` — jangan menambahkan prefix dua kali. Rute yang dilindungi memakai `auth:sanctum` lalu `module.access:<slug>`. Middleware `module.access` saat ini **gagal tertutup (501)** sampai otorisasi Core dimigrasikan.

### 4.3 Kontrak antara frontend dan backend

- Satu-satunya kontrak adalah **`api/docs/openapi.json`**. Perubahan API **harus** memperbarui OpenAPI dan test kontrak **sebelum** frontend memakainya (`composer docs`, `composer docs:check`).
- Respons sukses dibungkus `{"data": ...}`; koleksi wajib paginasi (`data`, `meta`, `links`); error memakai envelope `{"error":{"code","message","details"}}`.
- Perubahan yang merusak kompatibilitas memakai `/api/v2`. Jangan mengubah arti v1 diam-diam.

## 5. Skema Data — Konvensi

- Satu file `schema.prisma` per modul, **co-located di `modules/<modul>/schema.prisma`** (bukan di `prisma/schema/`) — hanya `core.prisma` yang tetap di `prisma/schema/`. `prisma.config.ts` memakai scope hasil `api/tools/prisma-schema-scope.mjs` supaya `api/vendor` tidak terbaca; schema baru di dalam `modules/` tetap ditemukan otomatis.
- Nama model pakai PascalCase (`Campaign`, `Beneficiary`), nama field pakai camelCase.
- Karena semua schema digabung jadi satu namespace model global, nama model **harus diprefix nama modul** kalau entitasnya generik (mis. `LazsipNews`/`SarsipNews`, bukan `News`) — supaya tidak tabrakan. Nama tabel fisik (`@@map`) ikut diprefix (`lazsip_news`).
- **Model Eloquent untuk tabel milik Prisma** wajib memakai trait `HasPrismaCuid`, key bertipe string, dan `incrementing = false`. Nama tabel/kolom lama **tidak diubah** hanya karena konvensi URI baru.
- Field privat/sensitif (lihat aturan privasi di PRD modul terkait) **tidak boleh** ikut di respons publik — pada Next.js difilter di level query (`select`), pada Laravel **API Resource wajib memilih field secara eksplisit**. Dilarang `$model->toArray()` atau mengandalkan `$hidden` saja.
- Migration baru untuk modul tertentu tidak boleh mengubah/menghapus tabel modul lain.
- Kepemilikan migration (Prisma vs Laravel) belum diputuskan — lihat §3 dan `docs/arsitektur.md` §6.

## 6. Konvensi Kode

- Bahasa kode (variabel, fungsi, nama file, nama komponen/kelas): **Inggris**.
- Slug/URL rute publik Next.js & label yang tampil ke pengguna: **Bahasa Indonesia** (mis. `/lazsip/donasi`, `/lazsip/penyaluran-bantuan`).
- URI API Laravel: kata benda jamak, huruf kecil, kebab-case, di bawah prefix modul (`/api/v1/lazsip/campaigns`) — detail di `api/docs/CONVENTIONS.md`.
- Komentar kode boleh Bahasa Indonesia bila menjelaskan aturan bisnis lokal yang spesifik (aturan zakat, privasi data penerima manfaat).
- **TypeScript** strict — hindari `any` kecuali benar-benar tidak terhindarkan, dan beri komentar alasannya. Komponen React: functional component + hooks, ikuti pola yang sudah ada.
- **PHP/Laravel:** Form Request untuk validasi, API Resource untuk respons, controller tipis. Kualitas dijaga **Pint** (format), **Larastan** (analisis statis), dan **Pest** (test).
- Metode HTTP sesuai semantik: GET/HEAD tidak boleh mengubah data bisnis; PUT mengganti seluruh representasi; PATCH mengubah field yang dikirim; DELETE idempoten. Status HTTP mengikuti tabel di `api/docs/CONVENTIONS.md`.

## 7. Aturan Bisnis Kritis — Jangan Dilanggar

Ini aturan yang **wajib dijaga** di kode manapun yang menyentuhnya (Next.js maupun Laravel), karena kalau salah dampaknya ke uang/privasi orang sungguhan:

1. **Status transaksi `paid` hanya boleh diubah lewat webhook payment gateway** (atau endpoint simulasi khusus admin selama gateway belum ada) — tidak boleh dari sisi client/redirect sukses saja.
2. **Data sensitif penerima manfaat** (alamat, tanggal lahir, status pernikahan) tidak boleh pernah ikut di response endpoint publik manapun.
3. **Zakat dan donasi/infaq settle ke rekening berbeda** — jangan disatukan logikanya.
4. **Checkbox "tanggung biaya admin" default tercentang** pada form donasi — bukan default kosong.
5. Field/tabel privat (kolom internal, log sensitif) tidak boleh diekspos lewat endpoint yang dipanggil halaman publik.
6. **Otorisasi dicek ke database di setiap request** (`users.is_active`, `modules.is_active`, `module_access`). Keanggotaan modul tidak boleh disimpan di claim/ability token atau di-cache sebagai sumber kebenaran.

Kalau ragu apakah sebuah field/endpoint termasuk sensitif, cek dulu ke PRD modul terkait sebelum menulis kode — jangan asumsi sendiri.

## 8. Menambah atau Memigrasikan Modul (pola baku)

**Jangan mengubah kode modul yang sudah ada** saat melakukan langkah di bawah.

### 8.1 Modul baru

Backend modul baru ditulis **di Laravel sejak awal** (supaya tidak perlu dimigrasikan ulang), frontend di Next.js.

1. **Backend:** pastikan provider modul ada di `api/config/modules.php`; isi `Models`, `Http/Controllers`, `Http/Requests`, `Http/Resources`, `Policies`, dan `routes/api.php` sesuai `api/docs/CONVENTIONS.md`.
2. Lindungi rute dengan `auth:sanctum` + `module.access:<slug>`.
3. Perbarui `api/docs/openapi.json` (`composer docs`) dan tambahkan test (Pest).
4. **Frontend:** buat `modules/<modul>/` berisi `module.json`, `components/`, `pages/`, `admin/pages/` (tanpa `api/` Next.js), lalu file jembatan satu baris di `app/(public)/<modul>/**` dan `app/admin/<modul>/**`.
5. Tambahkan satu baris modul ke tabel `modules` (lewat panel `/admin/super/modul` atau seed).
6. Skema tabel: ikuti keputusan kepemilikan migration di `docs/arsitektur.md` §6.

### 8.2 Memigrasikan modul yang sudah ada di Next.js ke Laravel

Dikerjakan hanya bila diminta eksplisit, **satu modul per PR (atau backend dulu, baru frontend)**, mengikuti `docs/arsitektur.md` §7:

1. Backend: tulis ulang aturan bisnis modul sebagai service/controller Laravel, API Resource memilih field eksplisit (jaga aturan privasi §7), tambahkan test.
2. Perbarui `openapi.json` dan lulus `composer docs:check`.
3. Frontend: ganti pemanggilan logic Next.js dengan pemanggilan API Laravel dari server; hapus `modules/<modul>/api/` dan `app/api/<modul>/` setelah tidak dipakai.
4. Update status modul di `docs/arsitektur.md` §7 dan tabel §2 di file ini.

## 9. Yang Harus Dihindari

- Jangan bikin backend/server terpisah per modul (Go, Express, microservice, dsb). Backend hanya **satu**: Laravel di `api/`. Selama sebuah modul belum dimigrasikan, logic backend-nya boleh tetap di `app/api/` Next.js — tetapi **jangan menambah logic backend baru ke Next.js** untuk modul yang sedang/sudah dimigrasikan.
- Jangan bikin sistem login/JWT/token sendiri per modul — gunakan Core (Sanctum di sisi Laravel).
- Jangan mengekspos Bearer token ke JavaScript browser, log, atau props komponen.
- Jangan hardcode kredensial, API key, atau connection string — selalu lewat environment variable. Jangan pernah commit `.env` yang terisi atau dump database (repo ini **publik**).
- Jangan arahkan aplikasi Laravel ke `sipmodular_db`; development Laravel hanya memakai salinan `sipmodular_laravel_dev` (lihat `api/README.md`).
- Jangan menjalankan `migrate:fresh`, `migrate:refresh`, atau `db:wipe` pada database yang berisi tabel Prisma, dan jangan memakai `RefreshDatabase` di test.
- Jangan hapus atau modifikasi `modules/<modul lain>/schema.prisma` saat mengerjakan modul yang sedang difokuskan.
- Jangan mengubah `prisma.config.ts` tanpa membaca bagian "Prisma scanner isolation" di `api/README.md` — file ini dipakai semua developer.
- Jangan asumsikan payment gateway sudah final — ikuti mode simulasi sampai ada keputusan (lihat `prd-lazsip.md` §8).
- Jangan gunakan `localStorage`/`sessionStorage` untuk data yang seharusnya persisten di database.

## 10. Riwayat & Sumber Referensi

- `lazsiplp` (github.com/aslammghifar/lazsiplp) — repo lama LAZSIP, sumber referensi tampilan (komponen React) dan sebagian aturan bisnis (backend Go-nya). Bukan sumber kode yang dipanggil langsung — hanya referensi saat menulis ulang.
- `sarsiplp` (github.com/aslammghifar/sarsiplp) — repo lama SARSIP, referensi untuk Fase 3.
- `tanwir-qurani` (github.com/djofan/tanwir-qurani) — repo lama Tanwir Qurani (Laravel/Filament), referensi fitur untuk Fase 5. Ini aplikasi Laravel **lama yang terpisah**, bukan `api/` yang ada di repo ini.
- `insanpeduli.org` — website lama SIP, referensi konten/fitur untuk Fase 2.

## 11. Checklist Sebelum Menganggap Sebuah Fitur Selesai

- [ ] Data nyata dari database, tidak ada dummy/mock tersisa di kode yang di-commit.
- [ ] Route publik tidak mengekspos field privat (cek §7).
- [ ] Halaman admin diproteksi middleware Core, cek `module_access`.
- [ ] Frontend mengikuti struktur folder §4.1 — `app/` cuma berisi file jembatan satu baris, tidak ada file "nyasar" ke folder modul lain.
- [ ] Kalau menyentuh `api/`: `composer test`, `composer analyse`, `composer lint`, dan `composer docs:check` lulus; `openapi.json` ikut diperbarui.
- [ ] Kalau menyentuh frontend: `npm run lint`, `npm test`, dan `npm run build` lulus.
- [ ] Tidak ada secret/`.env`/dump database ikut ter-commit.
- [ ] Status modul di `docs/arsitektur.md` §7 dan tabel §2 file ini sudah diperbarui bila terjadi migrasi.
- [ ] Sesuai *Definition of Done* di PRD modul terkait sebelum ditandai selesai.
