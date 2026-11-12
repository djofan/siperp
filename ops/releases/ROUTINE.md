# Update rutin dan rollback SIPERP

Tool ini melanjutkan handover baseline yang telah berhasil pada VPS Ubuntu 22.04.
Aktif saat instalasi pertama: `20261112115845-f18799e58267`, web 3101/API 8101.
Legacy 3000/8000 tetap dipertahankan untuk tab sebelum handover. Tidak ada akses
SSH otomatis dari Codex: operator menjalankan perintah di Termius.

## Instalasi sekali

Upload `release.sh`, `routine.cjs`, `migration-plan.php` ke
`/usr/local/lib/siperp-release/`. File pendukung `runtime.cjs`, `queue-settings.php`,
dan `run-scheduler.sh` adalah versi yang sudah dipakai saat handover berhasil.
Direktori root:root 0755, file tooling root:root 0644, wrapper scheduler 0755.

```bash
bash /usr/local/lib/siperp-release/release.sh init
bash /usr/local/lib/siperp-release/release.sh status
```

Init mengadopsi baseline yang sudah aktif. Ia memeriksa routing yang diaudit,
worker, cron dan health, tidak mengalihkan upstream atau menjalankan migration.
Jika registry sudah ada, gunakan status; jangan init ulang atau menghapus registry.

## Update biasa tanpa migration

```bash
bash /usr/local/lib/siperp-release/release.sh prepare main
```

Prepare fetch `origin/main` tanpa checkout/pull di aplikasi lama, pin SHA penuh,
ekspor ke folder rilis baru, install dependency sesuai lockfile, dan build dengan
Node heap 1536 MiB serta prioritas CPU rendah. Target harus sudah ada di riwayat
main dan descendant dari commit aktif; SHA yang sudah merge juga bisa diberikan
sebagai pengganti `main`. Deploy commit yang sama diperbolehkan untuk uji pipeline.

`.env` API dan storage menggunakan symlink ke lokasi persisten lama. Env frontend
disalin privat dan public env dari ecosystem saat ini dipertahankan. Kunci Server
Actions yang sama dipakai; deployment ID dan port backend khusus setiap rilis.
Tidak mengganti APP_KEY, akun database, iPaymu, Resend, Firebase atau domain.

Setiap rilis mendapat port localhost baru yang tidak dipakai ulang (3102/8102,
3103/8103, dst). Konfigurasi PM2 memakai JSON. Setelah build, backend kandidat
ditambahkan ke Nginx dan frontend dijalankan. Readiness menunggu proses siap serta
DB connected, kemudian memeriksa halaman `/` dan `/lazsip` dan health publik lama.
Tidak ada trafik default publik ke kandidat pada tahap prepare.

Setelah muncul `RELEASE_READY: <ID>`, operator bisa melakukan smoke test tambahan
melalui SSH tunnel ke port lokal yang ditampilkan status, tanpa membuka port ke
internet. Lalu:

```bash
bash /usr/local/lib/siperp-release/release.sh activate <ID>
```

Activate memverifikasi kandidat, env tidak berubah, tidak ada pending migration,
dan state Nginx/worker/cron masih cocok. Database, env dan config dibackup privat.
Lock scheduler ditunggu, worker lama dihentikan dengan grace tanpa SIGKILL,
pointer dan worker dipindah, lalu routing Nginx diganti secara graceful. Health
publik dan marker deployment HTML harus cocok sebelum registry ditandai sukses.
Scheduler dapat melewati satu/lebih tick selama lock dipegang; jangan switch tepat
pada jadwal harian penting. Job antrean tetap di database. Tidak restart PHP-FPM,
tidak `artisan down`, tidak clear cache bersama, dan tidak stop cron global.

Hasil sukses `RELEASE_ACTIVE: <ID>`. Verifikasi di browser (termasuk tab lama),
worker, cron dan log; jangan membuat pembayaran nyata sebagai health probe.

## Bila ada migration

Prepare berhenti pada `MIGRATION_REVIEW_REQUIRED`, mencetak ID, nama migration,
hash file dan review token. Tidak menerapkan schema otomatis atau mengalihkan
publik. Migration yang pernah dideploy atau diterapkan melalui tool ini lalu
diubah/dihapus ditolak sebelum ekspor, termasuk source dari rilis retired.

```bash
bash /usr/local/lib/siperp-release/release.sh inspect <ID>
```

Review source: perubahan harus kompatibel dengan SEMUA versi yang masih melayani
request, worker, callback dan sesi yang tersimpan. Nama migration atau kata
"add" bukan bukti aman. Tinjau waktu DDL/metadata locks pada tabel besar juga;
database bersama berarti tidak semua perubahan bisa dijanjikan tanpa gangguan.
Perubahan drop/rename, type conversion, invariant baru, atau backfill berat perlu
rencana expand/contract terpisah; jangan mengakui kompatibel sekadar agar lanjut.

Hanya setelah review tersebut, gunakan token yang tepat:

```bash
bash /usr/local/lib/siperp-release/release.sh migrate <ID> <TOKEN> --reviewed-compatible
bash /usr/local/lib/siperp-release/release.sh build <ID>
bash /usr/local/lib/siperp-release/release.sh activate <ID>
```

Token mengikat commit dan hash seluruh file pending. Perubahan plan/env/active
release membuat operasi ditolak. Backup dibuat sebelum migrate. Tidak memakai
`migrate:fresh`, `refresh`, `rollback`, `--pretend`, seeder atau restore DB otomatis.
Migrate yang terhenti dapat sudah menerapkan sebagian DDL; `attention-required`
memblok deployment berikutnya sampai operator memeriksa keadaan. Jangan hapus
flag tanpa inspeksi. Boot/package discovery/build kode baru yang memerlukan tabel
yang belum ada juga bisa gagal saat prepare; versi aktif tetap berjalan.

## Rollback kode

```bash
bash /usr/local/lib/siperp-release/release.sh rollback
```

Target hanya rilis previous yang masih disimpan. Tool memeriksa health, env API,
schema history dan timeout worker. Jika `.env` berubah sejak rilis lama dicache,
rollback ditolak sampai config direview; tidak diam-diam memulihkan kredensial lama.
Tidak memulihkan database; transaksi yang masuk setelah update tetap dipertahankan.
Kode lama harus tetap kompatibel dengan schema setelah migration yang telah
disetujui, sebab schema tidak dikembalikan oleh rollback.

Rollback normal mengembalikan halaman baru/default dan background ke previous.
Routing versi untuk tab yang sudah terbuka tetap ada sampai reload. Jadi rollback
bukan isolasi total kode baru bagi tab yang masih terbuka; jika rilis tidak aman
untuk dilayani sama sekali, perlukan penanganan darurat dan refresh klien.

Bila switch gagal di tengah jalan, tool mencoba mengembalikan pointer, worker,
routing dan registry snapshot. Pada rollback darurat otomatis ini, tab yang sempat
memuat rilis gagal mungkin harus reload. Jika pemulihan gagal, flag
`attention-required` berisi path backup dan semua deployment baru diblok. Jangan
restart/delete semua PM2 atau restore DB aktif untuk menghilangkan error.

## Retensi pada VPS 4 GB

Tool membatasi tiga rilis Node yang ready/active/retained, ditambah legacy 3000.
Prepare memerlukan RAM tersedia 2 GiB dan disk 5 GiB; bila tidak cukup, pindahkan
build ke CI atau tambah kapasitas. Tidak menjanjikan nol dampak CPU/I/O pada VPS
bersama. Beberapa rilis yang sangat cepat berturut-turut bisa mencapai batas
retensi sebelum 24 jam; jangan memaksa stop rilis yang masih dibutuhkan.

```bash
bash /usr/local/lib/siperp-release/release.sh status
bash /usr/local/lib/siperp-release/release.sh retire <ID-LAMA> --ack-old-tabs-reload
```

Retire hanya untuk rilis retained, bukan active atau previous, dan minimal
24 jam sejak menjadi retained. Operator menyetujui tab lama mungkin perlu reload. Routing versi tersebut
dilepas, proses Node dan API localhost-nya dihentikan, PM2 disimpan. Folder kode,
DB, env, upload, backup dan storage tidak dihapus. Port tidak dipakai ulang agar
request versi lama tidak diarahkan ke aplikasi lain. Arsip/pembersihan disk
memerlukan operasi terpisah dengan verifikasi path; tool tidak recursive-delete.

## Lokasi operasional

- Source Git: `/var/www/siperp`, fetch saja; jangan build/pull/restart di tempat.
- Aktif: `/var/www/siperp-deploy/current` (symlink root-owned).
- Registry: `/var/www/siperp-deploy/registry.json` (root 0600).
- Backup: `/var/www/siperp-deploy/backups/` (root 0700, DB/env 0600).
- Env/storage persisten: `/var/www/siperp/api/.env` dan `api/storage` lama.
- SATU cron: `/etc/cron.d/siperp-scheduler`, wrapper dengan flock bersama.
- SATU worker: `siperp-worker` dengan drop-in path rilis absolut.
- Routing: `/etc/nginx/conf.d/siperp-release-routing.conf`.
- API lokal per rilis: `/etc/nginx/conf.d/siperp-api-<ID>.conf`.

Jangan gunakan kembali handover-baseline.sh setelah manager di-init; jangan hapus
source/storage lama atau registry untuk mengatasi state drift. Env cache, key
rotation, perubahan queue contract atau konfigurasi produksi adalah perubahan
terpisah yang harus tetap kompatibel dengan versi retained.

## Verifikasi tooling

```bash
bash -n ops/releases/release.sh
node --check ops/releases/routine.cjs
php -l ops/releases/migration-plan.php
node --test tests/release-runtime.test.cjs tests/release-routine.test.cjs
```

Tes mencakup state transition, rollback, version routing, port reuse, gate
migration hash, dan retensi. Integrasi Nginx/systemd/PM2/Linux dan transaksi gagal
di tengah tiap tahap tetap harus diuji pada VPS/staging; tes helper lokal bukan
bukti deployment production telah berhasil. Uji awal dapat memakai commit aktif
yang sama agar perilaku bisnis tidak berubah.

Pada 12 November 2026 operator melaporkan uji VPS berhasil: prepare commit
`f18799e58267`, aktivasi rilis `20261112132317-f18799e58267`, lalu rollback ke
`20261112115845-f18799e58267`. Worker tetap aktif dan pemantauan health tetap
HTTP 200. Ini memvalidasi jalur sukses dengan kode/schema yang sama; bukan uji
migration baru, semua skenario kegagalan, atau beban produksi tinggi.
