<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Aturan arsitektur SIPERP

Baca `CLAUDE.md` dan `docs/arsitektur.md` sebelum perubahan. Frontend Next.js berada di root, backend Laravel di `api/`, dan seluruh modul bisnis aktif memakai Laravel.

- `modules/<modul>/api/` hanya klien API dan server action tipis; jangan mengembalikan Prisma atau business logic database ke Next.js.
- `app/` menjaga jembatan routing dan konfigurasi segmen Next.js. Komponen dan halaman modul berada di `modules/<modul>/`.
- Auth dikelola Core dan Sanctum. Jangan mengekspos token, kredensial, data privat, atau endpoint admin ke publik.
- Baca `api/docs/CONVENTIONS.md` sebelum perubahan backend. Perubahan kontrak memperbarui OpenAPI dan test terkait.
- Migration aktif berada di Laravel. Jangan menjalankan migration Prisma legacy atau perintah penghapus database pada data pengguna.
- Tests backend memakai SQLite dalam memori melalui `api/phpunit.xml`; `RefreshDatabase` dibatasi pada lingkungan test tersebut.
- Storage Laravel bersifat persisten dan dapat berisi file privat; build frontend tidak boleh memindainya.
- Jangan commit `.env`, kredensial, dump database, atau upload runtime. Repo ini publik.
- Jalankan pemeriksaan yang sesuai perubahan; pertahankan pekerjaan lokal pengguna yang tidak termasuk tugas.