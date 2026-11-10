# Data demo modul Bantuan

Seeder ini hanya untuk database development lokal. Seeder menolak berjalan jika `APP_ENV` bukan `local`, tidak dipanggil oleh `DatabaseSeeder`, dan aman dijalankan ulang tanpa menggandakan akun atau pengajuan.

Jalankan dari folder `api` dengan password sementara yang tidak disimpan ke Git:

```powershell
$env:BANTUAN_DEMO_PASSWORD = "ganti-dengan-password-uji"
php artisan db:seed --class=Database\\Seeders\\BantuanDemoSeeder
Remove-Item Env:BANTUAN_DEMO_PASSWORD
```

Kode akun yang dibuat:

| Kode | Peran |
| --- | --- |
| `BTADMIN01` | Admin Bantuan |
| `BTREQ001` | Pemohon |
| `BTCC0001` | SIP Call Center |
| `BTVER001` | Verifikator |
| `BTAPP001` | Approver |
| `BTFUND01` | Pengaju Dana |
| `BTTRES01` | Bendahara |
| `BTCHAIR1` | Ketua |
| `BTVOL001` | Relawan santunan |

Semua akun memakai password dari `BANTUAN_DEMO_PASSWORD`. Seeder juga membuat delapan pengajuan bernomor `BNT-DEMO-001` sampai `BNT-DEMO-008` pada tahap berbeda agar antrean tugas PWA dapat diuji lintas peran. Seluruh nama diawali `[Demo]` dan kontak menggunakan data fiktif.
