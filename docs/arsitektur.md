# Arsitektur Platform SIP — Next.js + Laravel

**Status:** berlaku mulai 14 Oktober 2026 · **Pemilik dokumen:** tim siperp
**Fungsi:** sumber kebenaran tunggal untuk arsitektur. Dokumen lain (`CLAUDE.md`, `README.md`, `PRD.md`, `prd-*.md`, `ALUR.md`) merujuk ke sini dan tidak mengulang isinya. Bila ada yang bertentangan, dokumen ini yang benar — lalu perbaiki dokumen yang lain.

## 1. Ringkasan

Platform terpadu Solidaritas Insan Peduli: **satu repo, satu database MySQL, satu sistem login**, terdiri dari dua aplikasi.

```
 Browser
    │  HTTPS
    ▼
┌──────────────────────────────┐        Authorization: Bearer <token>        ┌─────────────────────────────┐
│  Next.js (frontend)          │ ──────────────────────────────────────────▶ │  Laravel (backend, api/)    │
│  App Router, TypeScript      │   hanya dari server Next (Server Components │  REST /api/v1/<modul>       │
│  modules/<modul>/…           │   & Actions), bukan dari browser            │  app/Modules/<Modul>/…      │
└──────────────┬───────────────┘                                             └──────────────┬──────────────┘
               │  Prisma                                                                    │ Eloquent
               │  (SEMENTARA: modul yang belum dimigrasikan)                                │
               └─────────────────────────────┐        ┌─────────────────────────────────────┘
                                             ▼        ▼
                                      ┌───────────────────┐
                                      │  MySQL (satu DB)  │
                                      └───────────────────┘
```

Garis Prisma dari Next.js langsung ke database **sementara**: ia dipakai oleh modul yang belum dimigrasikan. Setelah sebuah modul dimigrasikan, frontend modul itu hanya memanggil API Laravel.

## 2. Pembagian tanggung jawab

| | Next.js (frontend) | Laravel (backend, `api/`) |
|---|---|---|
| Tugas | Tampilan, routing halaman, SSR, interaksi pengguna | Aturan bisnis, validasi, otorisasi, akses data, integrasi eksternal |
| Bahasa | TypeScript | PHP |
| Akses database | Prisma — **hanya** untuk modul yang belum dimigrasikan | Eloquent — untuk modul yang sudah dimigrasikan |
| Bentuk modul | `modules/<modul>/{pages, admin/pages, components}` | `api/app/Modules/<Modul>/{Http, Models, Policies, Events, Listeners, Providers, routes}` |
| Kualitas | ESLint, `next build` | Pint, Larastan, Pest, kontrak OpenAPI |
| Yang tidak boleh | Menaruh logic backend baru untuk modul yang sedang/sudah dimigrasikan; menyimpan token di sisi browser | Membaca sesi cookie; mengakses `sipmodular_db` saat development; mengubah tabel bisnis lewat migration Laravel (lihat §6) |

Prinsip yang tidak berubah: **modular monolith** (bukan microservices), modul **flat/sejajar**, tidak ada backend per modul, kerja lintas modul lewat service/event yang eksplisit.

## 3. Alur request dan autentikasi

Hanya **Sanctum personal access token** yang dipakai. Tidak ada sesi cookie di sisi Laravel, tidak ada `statefulApi`, tidak ada route `csrf-cookie`.

1. Pengguna login di Next.js. *(Integrasi login/logout dengan Laravel **belum** dibuat — menunggu migrasi Core. Saat ini `POST /api/v1/auth/login` hanya placeholder dengan balasan 501; sesi Next.js masih JWT dalam cookie.)*
2. Laravel menerbitkan token (`Core/Auth/TokenIssuer`) dengan kedaluwarsa **absolut 7 hari**; hanya hash SHA-256 token yang disimpan. Pemakaian token tidak memperpanjang masa berlakunya.
3. Next.js menyimpan token mentah di **cookie HttpOnly miliknya sendiri**.
4. Server Components/Actions membaca cookie itu di server dan memanggil Laravel dengan `Authorization: Bearer <token>` dan `Accept: application/json`. **Browser tidak memanggil Laravel langsung.**
5. Rute terlindungi memakai `auth:sanctum` lalu `module.access:<slug>`. Otorisasi modul **dibaca dari database di setiap request** (`users.is_active`, `modules.is_active`, `module_access`, kebijakan bypass superadmin), bukan dari klaim/ability token dan tidak di-cache sebagai sumber kebenaran.
6. Saat ini `module.access` **gagal tertutup (501)** sampai Core dimigrasikan; tidak ada endpoint bisnis terlindungi yang terbuka.

Token tidak boleh terbuka ke JavaScript browser, log, atau props komponen yang diserialisasi. Logout kelak menghapus token dan membersihkan cookie Next. Login memakai limiter 5 percobaan per menit per email (dinormalisasi) dan IP; konfigurasikan *trusted proxies* dengan sengaja sebelum production.

**Kompatibilitas selama transisi:** hash password bcrypt dapat diverifikasi dua arah antara Next.js (bcryptjs) dan Laravel; Laravel tidak menulis ulang hash saat login (`hashing.rehash_on_login=false`); ID memakai CUID v1 lewat trait `HasPrismaCuid` (key string, `incrementing=false`); timezone UTC di kedua sisi.

## 4. Struktur repo

```
siperp/
├── app/                       Next.js — hanya file "jembatan" satu baris ke modules/ (+ route segment config literal)
├── modules/<modul>/           frontend modul: pages, admin/pages, components, schema.prisma
│   └── api/                   HANYA modul yang belum dimigrasikan (logic & route handler Next.js)
├── components/                komponen UI bersama dan shell admin
├── prisma/                    core.prisma, migrations, seed
├── api/                       Laravel
│   ├── app/Modules/<Modul>/   kode backend per modul (provider, routes, controller, resource, model, policy)
│   ├── app/Http/ …            komponen bersama (CollectionRequest, ErrorResource, middleware)
│   ├── app/Support/           HasPrismaCuid dan helper lain
│   ├── config/modules.php     daftar provider modul
│   ├── docs/CONVENTIONS.md    konvensi REST
│   ├── docs/openapi.json      kontrak API
│   └── tests/                 Pest
└── docs/                      PRD dan dokumen ini
```

Rincian pola file jembatan Next.js: `CLAUDE.md` §4.1. Rincian sisi Laravel: `CLAUDE.md` §4.2 dan `api/README.md`.

## 5. Kontrak API

- Satu-satunya kontrak antara frontend dan backend: **`api/docs/openapi.json`**. Perubahan API wajib memperbaruinya (`composer docs`) dan lulus `composer docs:check` **sebelum** frontend memakainya.
- Prefix `/api/v1/<modul>` dipasang otomatis oleh provider modul. Perubahan yang merusak kompatibilitas memakai `/api/v2`.
- Respons sukses dibungkus `{"data": …}`; koleksi wajib paginasi (`data`, `meta`, `links`); error memakai `{"error":{"code","message","details"}}`; error 5xx berpesan umum tanpa detail internal.
- Respons selalu lewat **API Resource dengan field dipilih eksplisit** — dilarang `$model->toArray()` atau hanya mengandalkan `$hidden`. Field privat (lihat `CLAUDE.md` §7) tidak boleh muncul.
- GET/HEAD tidak mengubah data bisnis. Endpoint pembuatan pembayaran wajib menerima header `Idempotency-Key`; penyimpanan idempotensi production **belum** diimplementasikan (menunggu migrasi Payment).
- Detail status HTTP dan konvensi penamaan: `api/docs/CONVENTIONS.md`.

## 6. Database dan migration

- **Satu database MySQL bersama.** Tabel dan migration yang ada saat ini **dimiliki Prisma (Next.js)**. Laravel hanya menambah migration `personal_access_tokens`.
- Development Laravel memakai salinan terisolasi **`sipmodular_laravel_dev`**; jangan pernah mengarahkan Laravel ke `sipmodular_db`. Dilarang `migrate:fresh`, `migrate:refresh`, `db:wipe`, dan `RefreshDatabase`.
- Schema Prisma ada di `modules/<modul>/schema.prisma` dan `prisma/schema/core.prisma`; `prisma.config.ts` memakai scope yang tidak membaca `api/vendor`.
- Model Eloquent untuk tabel milik Prisma: trait `HasPrismaCuid`, key string, `incrementing=false`; nama tabel/kolom lama tidak diubah.

> **Keputusan terbuka — kepemilikan migration jangka panjang: Prisma atau Laravel?**
> Dua sistem migration yang menulis ke database yang sama mudah bentrok. Keputusan harus diambil dan dicatat di sini **sebelum modul bisnis pertama dimigrasikan**. Sampai ada keputusan, berlaku aturan di atas (Prisma pemilik; Laravel tidak mengubah tabel bisnis).

## 7. Strategi migrasi (strangler, bertahap)

Backend dipindah dari Next.js ke Laravel **satu modul per kali**. Modul yang belum dipindah tetap berjalan penuh di Next.js.

**Urutan yang direncanakan:**

1. Fondasi Laravel — **selesai** (branch `feature/laravel-api`).
2. **Core** (login, logout, otorisasi `module_access`) — langkah berikutnya, karena semua modul bergantung padanya. Tercakup: integrasi token di Next.js, login kode akun Tanwir/Ojol, keputusan kepemilikan migration (§6).
3. Modul bisnis satu per satu. Urutan modul mengikuti prioritas yang disepakati tim (usulan awal: LAZSIP dahulu karena progresnya paling jauh; Payment membutuhkan kebijakan idempotensi dan retensi sebelum dimigrasikan).

**Langkah per modul** (satu modul per PR, atau backend dulu lalu frontend):

1. Tulis ulang aturan bisnis di Laravel (service/controller), API Resource dengan field eksplisit, test Pest.
2. Perbarui `openapi.json`; lulus `composer test`, `composer analyse`, `composer lint`, `composer docs:check`.
3. Ganti pemanggilan logic Next.js dengan pemanggilan API Laravel dari server; hapus `modules/<modul>/api/` dan `app/api/<modul>/` setelah tidak dipakai.
4. Perbarui tabel status di bawah dan di `CLAUDE.md` §2.

> Bentuk klien API di Next.js (lokasi folder dan helper pemanggil) **belum ditetapkan**; ditetapkan saat Core dimigrasikan dan dicatat di sini.

**Status per modul (14 Oktober 2026):**

| Modul | Backend saat ini | Laravel (`api/app/Modules/`) | Status migrasi |
|---|---|---|---|
| Core | Next.js | Kerangka + auth placeholder | **Berikutnya** |
| Payment | Next.js | Kerangka kosong | Belum |
| Lazsip | Next.js | Kerangka kosong | Belum |
| Sip | Next.js | Kerangka kosong | Belum |
| Academy | Next.js | Kerangka kosong | Belum |
| Sarsip | Next.js | Kerangka kosong | Belum |
| Tanwir | Next.js | Kerangka kosong | Belum |
| Ojol | Next.js | Kerangka kosong | Belum |
| Teknisi | Next.js | Kerangka kosong | Belum |

## 8. Daftar keputusan

| Hal | Keputusan | Status |
|---|---|---|
| Stack | Frontend Next.js, backend Laravel 13, MySQL | Diputuskan |
| Gaya arsitektur | Modular monolith, modul flat, tanpa backend per modul | Diputuskan |
| Pola migrasi | Bertahap per modul (strangler) | Diputuskan |
| Autentikasi API | Sanctum Bearer, kedaluwarsa absolut 7 hari, token di cookie HttpOnly Next.js | Diputuskan (integrasi menunggu Core) |
| Otorisasi modul | Dibaca dari database di setiap request | Diputuskan |
| Kontrak API | OpenAPI + konvensi REST `/api/v1` | Diputuskan |
| Kepemilikan migration (Prisma vs Laravel) | — | **Belum diputuskan** |
| Bentuk klien API di Next.js | — | **Belum diputuskan** |
| Penanganan unggahan besar & streaming (Tanwir/Ojol/Academy) setelah migrasi | — | **Belum diputuskan** |
| Idempotensi & retensi untuk Payment | — | **Belum diputuskan** |
| Payment gateway final | — | **Belum diputuskan** |
| Deployment dua proses (Next.js + Laravel, PHP ≥ 8.4.1) | — | **Belum diputuskan** |

## 9. Dokumen terkait

- `CLAUDE.md` — aturan kerja & struktur folder (dibaca otomatis oleh Claude Code); `AGENTS.md` — aturan untuk agent lain.
- `README.md` — setup lokal dan skrip.
- `ALUR.md` — alur kerja Git dan checklist PR.
- `docs/PRD.md`, `docs/prd-<modul>.md` — spesifikasi produk dan aturan bisnis.
- `api/README.md`, `api/docs/CONVENTIONS.md`, `api/docs/openapi.json`, `api/VERIFICATION.md` — sisi Laravel; `VERIFICATION.md` adalah *snapshot* hasil verifikasi pada tanggal tertentu, bukan dokumen yang selalu mutakhir.
