# Arsitektur SIPERP

Status implementasi: 29 Oktober 2026. Dokumen ini menjelaskan runtime saat ini; PRD modul tetap menjadi acuan kebutuhan produk.

## 1. Komponen runtime

- Frontend Next.js App Router di root repository menangani halaman, komponen, dan server action tipis.
- Backend Laravel di `api/` menangani autentikasi, otorisasi, database, validasi, pembayaran, upload, backup, queue, dan scheduler.
- Satu database MySQL bersama, dengan tabel dan layanan yang dibatasi per modul.
- Core, SIP, LAZSIP, SARSIP, Academy, Tanwir, Ojol, Teknisi, Bantuan, dan Payment menggunakan Laravel. Kode Prisma lama di `api/database/legacy` hanya referensi, bukan runtime atau perintah deployment.

## 2. Alur request dan autentikasi

Browser mengakses frontend melalui HTTPS. Rewrite `next.config.ts` meneruskan `/api/*` ke `${LARAVEL_API_URL}/*`; nilai backend berakhir `/api/v1`.

Server Components dan Actions memakai `lib/api.ts`. Cookie sesi HttpOnly diteruskan sebagai Bearer token ke Laravel. Middleware Laravel juga menerima cookie pada request browser melalui rewrite dan memeriksa Origin untuk request perubahan data.

Sanctum dan Core mengelola akun, status aktif, serta akses modul. API key, Bearer token, password, dan kunci backup tidak boleh masuk props publik, log, atau JavaScript browser. Endpoint admin tidak boleh dibuka hanya untuk mengatasi error halaman publik.

`FRONTEND_ORIGINS` dan `CORS_ALLOWED_ORIGINS` harus sesuai origin frontend, termasuk skema HTTPS. `SESSION_SECURE_COOKIE=true` digunakan pada deployment HTTPS.

## 3. Batas modul

Frontend berada di `modules/<modul>/`; `app/` berisi jembatan routing dan konfigurasi segmen yang diperlukan Next.js. Backend berada di `api/app/Modules/<Modul>/`. Folder `modules/<modul>/api/` berisi klien API dan server action, bukan query database atau penulisan upload lokal.

Komunikasi lintas modul memakai kontrak dan service eksplisit. Business logic dan pemeriksaan hak akses tetap di Laravel walaupun frontend menyembunyikan tombol tertentu.

## 4. Database dan migration

Migration aktif berada di `api/database/migrations`. Gunakan `php artisan migrate:status` untuk memeriksa migration yang belum dijalankan, dan backup database sebelum perubahan skema production. Jangan menjalankan migration Prisma lama di VPS.

Development lokal memakai database terisolasi `sipmodular_laravel_dev`. Test backend memakai SQLite dalam memori sesuai `api/phpunit.xml`; `RefreshDatabase` hanya boleh digunakan pada lingkungan test tersebut. Jangan menjalankan `migrate:fresh`, `migrate:refresh`, atau `db:wipe` pada database berisi data pengguna.

## 5. File dan background jobs

Upload dan backup disimpan Laravel di `api/storage`, terpisah dari kode frontend. Storage dan `bootstrap/cache` memerlukan izin tulis untuk proses PHP dan worker. Jangan membuka folder privat lewat web server.

Tailwind memindai folder frontend secara eksplisit di `app/globals.css`, sehingga build tidak mencoba membaca upload privat Laravel.

Queue pembayaran memakai koneksi `payment` dan antrean `callbacks,receipts`. Scheduler menjalankan tugas yang terdaftar dalam `api/routes/console.php`. Keduanya harus dikelola service manager atau cron, bukan bergantung pada terminal SSH yang terbuka.

## 6. Deployment

Frontend dan PHP-FPM berjalan sebagai layanan terpisah di belakang Nginx. Backend internal hanya mendengarkan localhost. MySQL juga dibatasi ke localhost bila tidak ada kebutuhan akses lintas server.

URL publik pembayaran memakai domain HTTPS yang dapat diakses penyedia pembayaran. Mode, endpoint, VA, dan API key iPaymu harus sesuai lingkungan sandbox atau production. Kredensial hanya disimpan di environment VPS; `.env` tidak di-commit.

Merge GitHub tidak otomatis memperbarui VPS tanpa pipeline deployment. Setelah mengambil kode terbaru, perbarui dependensi yang berubah, jalankan migration yang telah direview jika diperlukan, build frontend, serta restart frontend dan worker. Muat ulang konfigurasi Laravel bila environment berubah. Jangan membuat ulang APP_KEY pada update rutin.

## 7. Pemeriksaan

- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build`.
- Backend: tes melalui konfigurasi `api/phpunit.xml`; jalankan pemeriksaan Composer yang sesuai jika backend berubah.
- Perubahan kontrak API memperbarui `api/docs/openapi.json` melalui tooling proyek dan pengujian kontrak.
- Perubahan UI tidak boleh mengembalikan dependensi Prisma atau akses database langsung dari Next.js.
