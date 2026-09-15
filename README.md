# SIP Modular

Platform digital terpadu Solidaritas Insan Peduli (SIP) — modular monolith Next.js (App Router) + Prisma + MySQL. Lihat `CLAUDE.md` untuk aturan kerja dan `docs/PRD.md` / `docs/prd-lazsip.md` untuk spesifikasi produk.

## Setup lokal

1. Salin `.env.example` menjadi `.env`, sesuaikan `DATABASE_URL` dan isi `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` untuk seed akun pertama.
2. Install dependency:
   ```bash
   npm install
   ```
3. Jalankan migration (schema Prisma multi-file ada di `prisma/schema/*.prisma`):
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
6. Buka [http://localhost:3000/admin/login](http://localhost:3000/admin/login) dan masuk dengan akun superadmin.

## Struktur folder

Mengikuti pola modular monolith di `CLAUDE.md` §4 — satu modul = satu set folder di `app/(public)/<modul>`, `app/admin/<modul>`, `app/api/<modul>`, `modules/<modul>`, `components/<modul>`, `prisma/schema/<modul>.prisma`. Modul `core` (auth, users, module registry) dipakai bersama semua modul lain.

## Skrip yang tersedia

- `npm run dev` — dev server (Turbopack).
- `npm run build` / `npm run start` — build & jalankan production build.
- `npm run lint` — ESLint.
- `npm run db:migrate` — buat & jalankan migration baru dari perubahan schema.
- `npm run db:seed` — jalankan `prisma/seed.ts`.
- `npm run db:studio` — buka Prisma Studio untuk lihat/edit data langsung.

## Deployment

Belum dikonfigurasi — perlu keputusan hosting (VPS/PaaS), database production, dan strategi penamaan domain per modul sebelum go-live pertama.
