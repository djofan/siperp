# Persiapan rilis terpisah — VPS SIPERP

Untuk VPS yang sudah menyelesaikan handover, lanjut ke [update rutin dan rollback](ROUTINE.md).
Script bootstrap di dokumen ini hanya dipakai sekali, bukan untuk setiap update.

Tahap pertama migrasi dari deployment di tempat ke rilis immutable. Audit VPS
12 November 2026: Ubuntu 22.04, RAM 3.8 GiB, 2 CPU, PHP 8.4, Node 24,
PM2 `siperp-web` pada 3000, Nginx API internal 8000. **Tool ini hanya menyiapkan
baseline; belum merupakan sistem deployment rutin atau perpindahan publik.**

## Batas tahap pertama

- Ekspor commit HEAD yang SAMA dengan checkout aktif `/var/www/siperp`;
  tidak melakukan pull atau menyunting checkout aktif.
- Folder baru `/var/www/siperp-deploy/releases/<waktu>-<sha>` dengan vendor,
  node_modules, build, dan bootstrap/cache tersendiri.
- `api/.env` dan `api/storage` menunjuk lokasi lama yang persisten. Jangan
  menghapus/memindahkan `/var/www/siperp` setelah persiapan.
- Env frontend yang sudah ada disalin privat. Variabel publik PM2 dipertahankan,
  endpoint internal diganti untuk kandidat; PM2 environment tidak dicetak.
- Port kandidat hanya localhost: frontend 3101 dan API 8101. Nginx reload
  menambahkan server internal; dua konfigurasi situs aktif tidak disunting.
- Kunci Server Actions dipertahankan jika tersedia; kandidat menggunakan
  `NEXT_DEPLOYMENT_ID`. Jangan membagikan key, manifest server, ecosystem config,
  atau `.env`. Env frontend lama tidak disalin dari output `pm2 env` ke chat.
- Tidak menjalankan migration, maintenance down, cache clear bersama, restart
  PHP-FPM, worker, scheduler, atau restart frontend aktif.
- Pemeriksaan migrasi hanya `migrate:status`. Hentikan jika ada pending atau gagal.
- Tidak `pm2 save` kandidat: reboot tetap memulihkan aplikasi lama yang tersimpan.
- Kegagalan menghapus proses/config Nginx kandidat yang dibuat oleh pemanggilan
  tersebut, menyimpan folder build untuk diagnosis, dan tidak mengalihkan publik.

Jangan menjanjikan nol gangguan absolut: build masih memakai RAM/CPU/disk VPS
bersama. Batas awal RAM tersedia 2 GiB dan disk 5 GiB, Node heap build 1536 MiB,
prioritas CPU rendah. Jika kapasitas tidak cukup, build perlu dipindahkan ke CI.

## Menjalankan persiapan pertama

Salin `prepare-baseline.sh` dan `runtime.cjs` dari folder ini melalui Termius SFTP
ke `/usr/local/lib/siperp-release/`. Kedua file berisi kode, tidak berisi rahasia.
Jalankan sebagai root (LF, bukan CRLF):

```bash
chown root:root /usr/local/lib/siperp-release/{prepare-baseline.sh,runtime.cjs}
chmod 755 /usr/local/lib/siperp-release
chmod 644 /usr/local/lib/siperp-release/{prepare-baseline.sh,runtime.cjs}
bash /usr/local/lib/siperp-release/prepare-baseline.sh
```

Hasil yang diharapkan: `CANDIDATE_READY: ...`, health kandidat dan publik valid.
Selama proses ini jangan menjalankan blok update lama (pull/build/restart di
checkout aktif). Tidak menjalankan tes SQLite pada VPS production.

Jika build sudah selesai tetapi koneksi pertama ke API ditolak sesaat setelah
reload Nginx, jangan ulangi build. Upload `runtime.cjs` terbaru dan
`resume-baseline.sh` ke folder tooling yang sama, lalu jalankan:

```bash
bash /usr/local/lib/siperp-release/resume-baseline.sh <ID-folder-rilis>
```

Resume memerlukan BUILD_ID, vendor, cache config dan config PM2 yang sudah ada;
commit checkout aktif harus tetap cocok. Ia menolak config/proses/port kandidat
yang masih ada. Readiness mengulang koneksi yang ditolak, HTTP gagal, atau health
DB yang belum valid dengan batas percobaan; tidak menganggap reload sukses berarti
socket sudah siap. Publik tetap di upstream lama, tanpa migration/build ulang.

Konfigurasi PM2 baru menggunakan `ecosystem.release.json`. Nama lama
`ecosystem.release.cjs` tidak dikenali sebagai ecosystem config oleh PM2 pada VPS
ini dan sempat dijalankan sebagai program bernama `ecosystem.release`. Resume
mengonversinya sebagai user siperp, mempertahankan seluruh env/kunci build, dan
memvalidasi nama, cwd, script, port serta deployment ID sebelum dipakai. Proses
yang salah hanya dihapus berdasarkan ID setelah nama DAN path program cocok
dengan rilis kandidat ini; `siperp-web` dan proses rilis lain tidak dipilih.

## Sebelum pengalihan publik (tahap kedua)

Periksa sumber scheduler sebelum memasang apa pun: audit sebelumnya hanya membaca
crontab `siperp`, sedangkan jadwal mungkin berada pada root atau `/etc/cron.d`.
Catat satu sumber saja, jangan menambahkan scheduler kedua.

```bash
crontab -l 2>/dev/null | grep -E 'siperp|schedule:run' || true
grep -RnsE 'siperp|schedule:run' /etc/cron.d /etc/crontab || true
systemctl list-timers --all --no-pager | grep -Ei 'siperp|schedule' || true
```

Tahap kedua harus menyiapkan dan memverifikasi hal-hal berikut sebelum switch:

1. Simpan backup DB, env, Nginx, systemd dan cron; pastikan baseline benar-benar
   sehat. Backup DB bukan rollback otomatis; jangan memulihkan DB aktif sambil
   menerima transaksi baru.
2. Alihkan Nginx frontend secara graceful, pertahankan backend per rilis dengan
   root absolut supaya opcache tidak menukar kode melalui symlink.
3. Tangani aset/Server Actions halaman lama: archive aset publik saja dan/atau
   routing per deployment. Deployment ID saja tidak merutekan request lama;
   navigasi bisa reload dan formulir yang lama terbuka perlu diuji.
4. Pindahkan worker dan SATU scheduler ke rilis aktif; lindungi scheduler dengan
   lock bersama. Jangan menduplikasi worker/scheduler. Scheduler lama harus
   diselesaikan sebelum menjalankan jadwal versi baru.
5. Selaraskan worker timeout dengan timeout job dan `payment.retry_after` dari
   config aktif. Audit menemukan worker 60 detik, padahal job rekonsiliasi bisa
   lebih lama. `worker timeout < retry_after`, stop grace cukup untuk job aktif.
6. Verifikasi health publik, halaman publik, login, upload privat, callback
   pembayaran, serta worker/scheduler sebelum menonaktifkan versi lama.
7. Simpan rilis lama untuk rollback kode; drain koneksi aktif. Jangan menghapus
   rilis/storage secara otomatis.

Rilis berikutnya memerlukan gate migration kompatibel (expand/contract), backup,
readiness dan rollback upstream. Migration destruktif tidak boleh diotomatisasi
dengan asumsi rollback kode membatalkan skema. Script tahap pertama ini sengaja
tidak mengeksekusi switch atau menyunting cron tanpa audit lanjutan.

## Pemeriksaan lokal

```bash
bash -n ops/releases/prepare-baseline.sh
node --test tests/release-runtime.test.cjs
```

Tes lokal memeriksa readiness dan penanganan env/key dengan data dummy. Ia tidak
membuktikan integrasi Nginx/PM2/systemd Linux; kesiapan tersebut diperiksa pada
kandidat sebelum publik dialihkan.
