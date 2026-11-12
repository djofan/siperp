# Pengalihan baseline yang sudah sehat

Untuk audit VPS ini saja: baseline `20261112115845-f18799e58267`, web lama 3000,
web kandidat 3101, API lama 8000, API kandidat 8101. Source kedua versi harus sama.
Ini menyelesaikan bootstrap pertama, bukan tool deploy rutin untuk commit baru.

## Install kode tooling

Upload `runtime.cjs`, `handover-baseline.sh`, `run-scheduler.sh`, dan
`queue-settings.php` ke `/usr/local/lib/siperp-release`. Semua root:root; direktori
0755, file 0644. Cron memanggil wrapper secara langsung, sehingga khusus
`run-scheduler.sh` harus diberi mode **0755**. Jangan menyalin ecosystem config
atau secret ke repo.

```bash
bash /usr/local/lib/siperp-release/handover-baseline.sh activate 20261112115845-f18799e58267
```

## Urutan dan batas operasi

1. Gate: baseline ready, commit/checkout bersih dan cocok, metadata Next lama
   tanpa deployment ID, hanya satu entri di file cron yang diaudit. Tidak mengubah
   konfigurasi yang berbeda diam-diam. File handover/map/drop-in yang sudah ada
   membuat aktivasi berhenti untuk inspeksi, bukan menimpa backup.
2. Verifikasi kedua web dan API kandidat; periksa marker deployment pada HTML.
   Validasi timeout worker dari config kandidat (`worker timeout < retry_after`),
   serta ekstensi pcntl yang dibutuhkan untuk penghentian worker secara graceful.
3. Backup database konsisten dan env (0600), Nginx, cron, dan unit worker di
   `/var/www/siperp-deploy/handover/<ID>` (0700). Tidak melakukan migration.
4. Ambil scheduler lock yang sama dengan wrapper. Ubah SATU file cron yang sudah
   ada menjadi wrapper, tunggu satu batas menit plus 3 detik untuk reload cron,
   lalu tunggu proses PHP `artisan schedule:run` lama selesai (maks. 360 detik).
   Selama handover ada menit scheduler yang dilewati; jadwal tepat waktu pada
   menit tersebut tidak dijalankan ulang otomatis. Lakukan perpindahan awal
   di luar 01:00 UTC/jadwal harian penting. Tugas pembayaran per menit berjalan
   lagi pada tick berikutnya; web tetap melayani request.
5. Pasang drop-in worker dengan cwd/command absolut ke kandidat. `systemctl stop`
   mengirim SIGTERM, tidak memaksa SIGKILL. Jika belum selesai, jangan memulai
   worker kedua. Selama jeda ini antrean tersimpan di database, bukan dihapus.
6. Pointer `current` berpindah secara atomik. Mulai worker kandidat, pasang
   map routing dan upstream publik, `nginx -t`, graceful reload, lalu health
   publik dan HTML kandidat diperiksa. Jika langkah setelah perubahan gagal,
   coba rollback terkontrol. Kegagalan rollback diberi status attention-required.
7. PM2 save menyimpan KEDUA proses agar tersedia setelah reboot. Worker dan
   wrapper scheduler memakai kandidat. Tidak restart PHP-FPM, tidak maintenance
   down, tidak menghentikan cron global, tidak menghapus upload/sesi/cache.

Nginx mempertahankan TLS dan header proxy yang ada; timeout proxy menjadi 300s.
Backend lama/kandidat tetap ber-root absolut, tidak menukar PHP melalui symlink.
Pointer `current` hanya untuk scheduler/operasional, worker memakai path absolut.

## Halaman lama dan rollback

Dokumentasi Next versi terpasang dan kode server-action client mengonfirmasi
`x-deployment-id` untuk navigasi/actions dan `?dpl=` untuk aset. ID kandidat menuju
3101. RSC/action/aset dari build lama tanpa ID menuju 3000. Permintaan baru tanpa
penanda versi (termasuk API browser biasa) menuju upstream default. Source kedua
backend baseline identik dan storage/env/DB bersama. Ini tidak menjamin semua
form tanpa JavaScript atau tab yang terbuka sangat lama akan selalu kompatibel;
uji login dan simpan form pada tab lama sebelum pensiun proses lama.

```bash
bash /usr/local/lib/siperp-release/handover-baseline.sh rollback 20261112115845-f18799e58267
```

Rollback mengarahkan **halaman baru/default** ke 3000, mengembalikan worker dan cron
lama. Routing versi tetap dipertahankan untuk aset/permintaan tab kandidat yang
sudah terbuka; refresh halaman untuk memakai legacy. Kedua proses/API tidak
dimatikan. Ini rollback baseline sehat, bukan isolasi darurat proses yang rusak.
Jika kandidat tidak aman untuk dilayani sama sekali, perlu handover darurat dan
reload klien, bukan mempertahankan routing ke proses bermasalah.

Tidak ada pemulihan database otomatis: transaksi yang masuk setelah handover
tetap dipertahankan. Backup database bukan alasan menimpa DB aktif. Bila ada
attention-required, jangan ulangi aktivasi atau hapus rilis; periksa error dan
status layanan. Backup original tersedia untuk pemulihan manual yang direview.

Setelah berhasil, uji halaman publik, login Academy/Bantuan, form dari tab lama,
download privat, dan scheduler/worker. Jangan membuat pembayaran nyata hanya
untuk health check. Jangan menjalankan blok update lama di checkout aktif.
Untuk commit berikutnya gunakan [release manager rutin](ROUTINE.md), yang
menyediakan prepare/switch, gate migration, alokasi port, routing beberapa rilis,
dan retensi. Jangan memakai script bootstrap ini berulang kali sebagai update rutin.
