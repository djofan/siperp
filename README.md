# SIP Modular

Platform SIP memakai satu repositori dengan dua aplikasi yang terpisah:

- Next.js di root hanya menangani halaman, komponen, dan server action tipis yang memanggil API.
- Laravel di `api/` menangani autentikasi, otorisasi, validasi, database, pembayaran, upload, backup, queue, dan seluruh aturan bisnis.
- Folder `modules/<modul>` tetap menjadi batas modul frontend. Backend memakai batas yang sama di `api/app/Modules/<Modul>`.

Browser tetap memanggil `/api/*` pada origin Next.js. Rewrite di `next.config.ts` meneruskannya ke `LARAVEL_API_URL`, sehingga cookie HttpOnly dan URL formulir lama tetap bekerja.

## Menjalankan lokal

Persyaratan: Node.js 24+, PHP 8.3+, Composer, dan MySQL/MariaDB.

1. Siapkan frontend:

   ```bash
   npm install
   ```

   Buat `.env.local` bila Laravel tidak memakai URL default:

   ```env
   LARAVEL_API_URL=http://127.0.0.1:8000/api/v1
   ```

2. Siapkan backend:

   ```bash
   cd api
   composer install
   cp .env.example .env
   php artisan key:generate
   ```

   Isi koneksi MySQL pada `api/.env`. Dalam mode `local`, nama database wajib `sipmodular_laravel_dev` agar perintah pengembangan tidak salah menyentuh database lain.

3. Buat tabel dan registri modul:

   ```bash
   php artisan migrate
   php artisan db:seed
   ```

   Migration memakai tabel lama bila sudah ada dan hanya membuat tabel yang belum ada. Simpan backup sebelum mengarahkannya ke salinan database lama.

4. Jalankan dua proses:

   ```bash
   # terminal backend, dari api/
   php artisan serve

   # terminal frontend, dari root
   npm run dev
   ```

Untuk membuat superadmin pertama, gunakan Tinker agar password tidak tercatat di riwayat shell:

```bash
cd api
php artisan tinker
```

```php
app(\App\Modules\Core\Services\UserService::class)->create([
    'name' => 'Administrator',
    'email' => 'admin@example.com',
    'password' => 'ganti-dengan-password-kuat',
    'isSuperadmin' => true,
    'moduleIds' => [],
]);
```

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run api:test
cd api && composer lint
```

Test backend menggunakan SQLite `:memory:` dan tidak mengakses database lokal/produksi.

## Data runtime

Upload Laravel berada di `api/storage/app/private` dan `api/storage/app/public/uploads`. Backup terenkripsi berada di `api/storage/app/backups`. Folder upload dan backup lama di root sudah disalin ke lokasi tersebut untuk kompatibilitas data yang ada.

Worker queue dan scheduler wajib aktif di deployment:

```bash
php artisan queue:work
php artisan schedule:work
```

Atur `PAYMENT_GATEWAY`, kredensial iPaymu sandbox (`IPAYMU_API_KEY` dan `IPAYMU_VA`), `PAYMENT_API_URL`, Resend, `ERP_BACKUP_KEY`, dan `CORS_ALLOWED_ORIGINS` di `api/.env`. Gunakan `PAYMENT_GATEWAY=ipaymu_sandbox` untuk checkout iPaymu atau `simulation` untuk simulasi lokal. Restore backup hanya tersedia lewat CLI dan memerlukan database serta folder target kosong:

```bash
php artisan erp:backup list
php artisan erp:backup verify <file.sipbak>
php artisan erp:backup restore <file.sipbak> --confirm-empty-target --files-dir=/path/kosong
```

## Deployment

Deploy frontend dan backend sebagai dua proses. Arahkan `LARAVEL_API_URL` frontend ke endpoint Laravel yang berakhiran `/api/v1`. Proxy publik perlu meneruskan `/api/*` ke Laravel atau mempertahankan rewrite Next.js. Laravel memerlukan storage persisten, HTTPS, queue worker, scheduler, dan batas upload PHP minimal 50 MB untuk materi Academy.

Schema Prisma serta migration SQL lama disimpan hanya sebagai referensi di `api/database/legacy`; keduanya bukan runtime dan tidak boleh dijalankan.
