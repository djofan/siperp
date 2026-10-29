# Login kode akun di semua modul

Semua halaman masuk menggunakan **kode akun + password**. Email hanya data kontak. Backend tidak menerima email sebagai identitas login, termasuk untuk akun Academy lama dan pengajar.

Superadmin hanya satu akun dengan kode tetap **SASIP01**. Admin memakai nomor berurutan **AMSIP0001, AMSIP0002, dan seterusnya**. Superadmin membuat admin dan menentukan modul yang boleh dikelolanya melalui **Core → Kelola Akun**. Pembuatan superadmin tambahan ditolak, termasuk oleh indeks unik database.

Admin membuat akun operasional lewat **Core → Akun modul**, hanya untuk modul yang dia kelola. Pendaftaran peserta, teknisi, dan tim Bantuan tetap memakai formulir modul supaya data profil dan penempatan ikut lengkap. Admin tidak bisa membuat superadmin, membuat admin lain, atau memberi akses ke modul di luar kewenangannya. Kode akun operasional dan kode peserta lama tetap terpisah dari penomoran admin.

Kode terlihat di **Core → Kelola Akun → Kode login** dan detail akun. Pada Bantuan, kode operasional terlihat di **Tim** dan pada pesan setelah pembuatan akun. Perubahan nama, email, dan password tidak mengubah kode. Jika akun operasional diangkat menjadi admin oleh superadmin, akun tersebut mendapatkan kode AMSIP.

Kode peserta yang sudah ada seperti `PAZ001`, `PTH01`, `PTQ001`, dan `POM001` dipertahankan. Jika satu identitas lama memiliki beberapa kode, semuanya dipetakan ke akun yang sama. Huruf besar/kecil dan spasi di awal/akhir diabaikan. Kode tidak memberikan izin tambahan: setiap modul tetap memeriksa status akun, status modul, dan keanggotaan/hak akses.

## Penerapan

Jalankan migrasi Laravel sebelum memakai kode baru:

```bash
cd api
php artisan migrate --force
```

Migrasi `2026_10_29_000000_add_account_login_codes.php` menambahkan `users.code` dan registri unik `user_login_codes`, menyalin kode peserta lama, kemudian memberi kode kepada akun yang belum memilikinya. Migrasi `2026_10_29_010000_enforce_admin_account_codes.php` mengganti kode superadmin menjadi SASIP01 dan admin modul menjadi AMSIP, serta menambahkan batas satu superadmin di database. Kode Core sebelumnya untuk akun tersebut tidak lagi dipakai. Password, sesi login, dan izin tidak diubah. Konflik kode antaridentitas ditolak agar login tidak mengarah ke orang yang salah. Autentikasi Core tidak membaca tabel modul opsional.

Untuk akun lama yang sebelumnya memakai email, pengelola membagikan kode dari daftar akun. Password lama tetap berlaku. Email tidak wajib saat membuat akun Core atau tim Bantuan. Impor peserta Academy menampilkan kode login beserta password sementara.

Migrasi `2026_10_29_020000_rename_admin_login_codes_to_amsip.php` mengganti awalan ASIP lama menjadi AMSIP dengan nomor yang sama. Kode lama tidak lagi dipakai untuk login. Superadmin tetap SASIP01; password, sesi, izin, dan kode peserta tidak berubah.

## API

Semua endpoint login menerima JSON yang sama:

```json
{"code":"AMSIP0001","password":"password-pengguna"}
```

Endpoint: `/api/v1/auth/login`, `/api/v1/academy/masuk`, `/api/v1/teknisi/masuk`, `/api/v1/tanwir/auth/login`, `/api/v1/ojol/auth/login`. Field `email` atau `nip` tidak lagi menggantikan `code`. Batas percobaan tetap lima per menit per kode yang dinormalisasi dan alamat IP.
