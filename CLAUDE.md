# CLAUDE.md

## Arsitektur dan sumber acuan

SIPERP adalah platform modular dengan frontend Next.js di root, backend Laravel di `api/`, dan satu database MySQL. Baca `docs/arsitektur.md`, `README.md`, serta PRD modul sebelum mengubah perilaku produk.

Semua modul bisnis aktif memakai Laravel. `modules/<modul>/api/` adalah klien API atau server action tipis. Jangan mengembalikan query Prisma, backend bisnis Next.js, atau penyimpanan upload di frontend. Schema dan migration lama di `api/database/legacy` hanya referensi.

## Struktur dan batas tanggung jawab

- `app/`: jembatan App Router dan konfigurasi route segment.
- `modules/<modul>/`: halaman publik, admin, komponen, kontrak klien, dan server action frontend.
- `components/`: komponen bersama; perubahan gaya modul harus tetap terbatas pada modulnya.
- `api/app/Modules/<Modul>/`: controller, model, service, policy, dan route backend.
- `api/database/migrations`: migration aktif. Satu modul tidak boleh mengubah aturan bisnis modul lain tanpa kebutuhan tugas.

## Keamanan dan data

Auth terpusat di Core dan Sanctum. Token HttpOnly diteruskan server ke Laravel; jangan membocorkannya ke browser, log, atau props publik. Backend tetap memeriksa akses meskipun UI sudah menyembunyikan kontrol.

Gunakan respons API dengan field publik yang eksplisit. Pertahankan pembatasan akses data pribadi, upload privat, catatan internal, dan endpoint admin. Jangan membuka endpoint admin untuk memperbaiki halaman publik.

Jangan commit `.env`, API key, password, dump database, upload runtime, atau kunci backup. Repo bersifat publik. Jangan menambahkan kredensial ke contoh atau dokumentasi.

## Database dan file

Development lokal memakai `sipmodular_laravel_dev`, bukan database production atau database lama. Tests menggunakan SQLite dalam memori sesuai `api/phpunit.xml`; `RefreshDatabase` hanya untuk lingkungan test tersebut. Jangan menjalankan `migrate:fresh`, `migrate:refresh`, atau `db:wipe` terhadap database dengan data pengguna.

Migration production harus direview dan didahului backup. Jangan membuat ulang APP_KEY pada deployment rutin. Upload dan backup tetap berada di storage Laravel yang persisten. Build frontend tidak boleh memerlukan pembacaan file privat Laravel.

## Kontrak dan verifikasi

Baca `api/docs/CONVENTIONS.md` sebelum perubahan backend. Perubahan kontrak API memperbarui OpenAPI memakai tooling proyek dan test terkait. Frontend dan backend mengikuti batas modul yang sama.

Baca panduan versi Next.js dalam `node_modules/next/dist/docs` sebelum menulis kode Next.js. Gunakan `npm run typecheck`, `npm run lint`, `npm test`, dan build sesuai perubahan. Tes backend harus memakai konfigurasi test, tidak mengakses database lokal atau production. Jalankan pemeriksaan Composer yang relevan jika backend berubah.

## Deployment dan pembayaran

Nginx meneruskan frontend ke Next.js dan backend internal ke PHP-FPM. Worker dan scheduler berjalan sebagai layanan terkelola. Merge GitHub tidak berarti VPS sudah ter-update.

Mode iPaymu, endpoint, dan kredensial harus cocok. Sandbox tidak menggunakan dana nyata. Jangan menyatakan produksi siap hanya karena checkout sandbox berhasil; uji callback dan status transaksi, dan pertahankan pemisahan transaksi simulasi, sandbox, serta produksi.
