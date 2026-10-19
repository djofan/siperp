<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aturan untuk agent (Codex, Claude Code, dsb) — arsitektur Next.js + Laravel

Bagian ini **di luar** blok `nextjs-agent-rules` di atas, supaya tidak tertimpa saat `next dev` menulis ulang blok tersebut. Jangan edit atau hapus penanda `BEGIN/END` di atas.

Project ini = **frontend Next.js** (root repo) + **backend Laravel** (`api/`) + satu database MySQL. Fondasi Laravel sudah ada, tetapi **belum ada modul bisnis yang dimigrasikan**: backend modul yang belum dimigrasikan masih di Next.js.

## Sebelum menulis kode

1. Baca `CLAUDE.md` (aturan wajib) dan `docs/arsitektur.md` (arsitektur, batas frontend/backend, status migrasi).
2. Kalau menyentuh folder `api/`: baca `api/README.md` dan `api/docs/CONVENTIONS.md` dulu.
3. Baca PRD modul terkait (`docs/prd-<modul>.md`) sebelum menyentuh aturan bisnis.

## Aturan keras untuk `api/` (Laravel)

- **Hanya** gunakan database salinan `sipmodular_laravel_dev`. Jangan pernah mengarahkan aplikasi ke `sipmodular_db`, dan jangan memakai `DB_URL`.
- **Dilarang** `migrate:fresh`, `migrate:refresh`, `db:wipe`, dan `RefreshDatabase`. Tabel bisnis dimiliki Prisma; jangan membuat migration Laravel yang mengubah tabel bisnis (kepemilikan migration belum diputuskan — lihat `docs/arsitektur.md` §6).
- Respons API **wajib** lewat API Resource dengan field dipilih eksplisit. Jangan `$model->toArray()`. Jangan membocorkan field privat (lihat `CLAUDE.md` §7).
- Model untuk tabel milik Prisma wajib memakai `HasPrismaCuid`, key string, `incrementing = false`.
- Ikuti `api/docs/CONVENTIONS.md`. Setiap perubahan API wajib memperbarui `api/docs/openapi.json` (`composer docs`) dan lulus `composer docs:check` sebelum frontend memakainya.
- Auth: Sanctum Bearer token saja. Jangan membuat sistem sesi/JWT lain. Jangan menaruh keanggotaan modul di claim/ability token.
- Sebelum selesai: `composer test`, `composer analyse`, `composer lint`.

## Aturan keras untuk frontend (Next.js)

- Jangan menaruh logic backend baru di `app/api/` atau `modules/<modul>/api/` untuk modul yang sedang/sudah dimigrasikan ke Laravel.
- Token Bearer tidak boleh sampai ke JavaScript browser, log, atau props yang diserialisasi.
- `app/` hanya berisi file jembatan satu baris ke `modules/<modul>/`.

## Umum

- Jangan memigrasikan modul ke Laravel kecuali diminta eksplisit. Satu modul per PR.
- Jangan commit `.env` yang terisi, dump database, atau file `clone.local.*`. Repo ini **publik**.
- Jangan mengubah `prisma.config.ts` tanpa membaca bagian "Prisma scanner isolation" di `api/README.md`.
