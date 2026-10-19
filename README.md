# SIP Modular

Platform digital terpadu Solidaritas Insan Peduli (SIP) — **frontend Next.js (App Router) + backend Laravel (API REST) + MySQL**, satu repo, satu database, satu sistem login.

> **Status transisi:** fondasi Laravel API (`api/`) sudah ada, tetapi belum ada modul bisnis yang dimigrasikan. Selama sebuah modul belum dimigrasikan, backend modul itu masih berjalan di Next.js (Prisma). Status per modul ada di [`docs/arsitektur.md`](docs/arsitektur.md) §7.

Mulai dari sini:

- [`CLAUDE.md`](CLAUDE.md) — aturan kerja & arsitektur (dibaca otomatis oleh Claude Code).
- [`docs/arsitektur.md`](docs/arsitektur.md) — arsitektur Next.js + Laravel, alur auth, strategi migrasi, keputusan terbuka.
- [`docs/PRD.md`](docs/PRD.md) dan `docs/prd-<modul>.md` — spesifikasi produk.
- [`api/README.md`](api/README.md) dan [`api/docs/CONVENTIONS.md`](api/docs/CONVENTIONS.md) — sisi Laravel.
- [`ALUR.md`](ALUR.md) — alur kerja Git tim.

## Kebutuhan

| Sisi | Kebutuhan |
|---|---|
| Frontend | Node.js + npm |
| Backend | PHP ≥ 8.4.1 (syarat lockfile saat ini; Laravel sendiri ^8.3), Composer 2.x, ekstensi PDO MySQL |
| Database | MySQL |

## Setup lokal — Frontend (Next.js)

1. Salin `.env.example` menjadi `.env`, sesuaikan `DATABASE_URL` dan isi `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` untuk seed akun pertama.
2. Install dependency:
   ```bash
   npm install
   ```
3. Jalankan migration (schema Prisma multi-file: `prisma/schema/core.prisma` + `modules/<modul>/schema.prisma`):
   ```bash
   npm run db:migrate
   ```
4. Seed akun superadmin pertama (idempotent, aman dijalankan ulang):
   ```bash
   npm run db:seed
   ```
5. Jalankan dev server:
   ```bash
   npm run dev
   ```
6. Buka <http://localhost:3000/admin/login> dan masuk dengan akun superadmin.

## Setup lokal — Backend (Laravel, folder `api/`)

Laravel **tidak boleh** diarahkan ke `sipmodular_db`. Development memakai salinan terisolasi `sipmodular_laravel_dev`; langkah membuat salinan dan mengisi `.env` ada di [`api/README.md`](api/README.md) (bagian *Isolated development database*). Ringkasnya, setelah salinan database siap:

```bash
cd api
copy .env.example .env      # Windows cmd; di macOS/Linux: cp .env.example .env
composer install
php artisan key:generate
php artisan serve --host=127.0.0.1 --port=8000
```

Jangan pernah commit `api/.env` yang terisi — repo ini publik.

## Struktur folder

```
app/                    Next.js App Router — hanya file "jembatan" satu baris ke modules/
modules/<modul>/        frontend modul (pages, admin/pages, components, schema.prisma);
                        api/ hanya ada di modul yang belum dimigrasikan ke Laravel
components/             komponen UI bersama dan shell admin
prisma/                 core.prisma, migrations, seed
api/                    backend Laravel
  app/Modules/<Modul>/    controller, request, resource, model, policy, routes per modul
  config/modules.php      daftar provider modul
  docs/                   CONVENTIONS.md dan openapi.json
docs/                   PRD dan dokumentasi arsitektur
```

Penjelasan lengkap: `CLAUDE.md` §4 dan `docs/arsitektur.md` §4. Modul `core` (auth, users, module registry) dipakai bersama semua modul lain.

## Skrip yang tersedia

**Frontend (root):**

- `npm run dev` — dev server (Turbopack).
- `npm run build` / `npm run start` — build & jalankan production build.
- `npm run lint` — ESLint.
- `npm test` — unit test (`tsx --test`). Skrip lain (seed konten demo, backup ERP, setup Teknisi, retry email) ada di `package.json`.
- `npm run db:migrate` — buat & jalankan migration baru dari perubahan schema Prisma.
- `npm run db:seed` — jalankan `prisma/seed.ts`.
- `npm run db:studio` — buka Prisma Studio untuk lihat/edit data langsung.

**Backend (`api/`):**

- `composer test` (atau `php artisan test`) — test Pest. Jalankan berurutan, jangan memakai `RefreshDatabase`.
- `composer analyse` — Larastan.
- `composer lint` — Pint (cek format).
- `composer docs` — ekspor kontrak OpenAPI; `composer docs:check` — deteksi selisih kontrak.

## Deployment

Belum dikonfigurasi — perlu keputusan hosting (VPS/PaaS), database production, strategi penamaan domain per modul, dan cara menjalankan **dua proses** (Next.js dan Laravel) sebelum go-live pertama.
