# Runtime AI dan worker Rapat pada VPS

Folder ini menyimpan tooling yang dipasang secara eksplisit oleh operator.
Tidak memasang model, mengubah `.env`, menjalankan migration, atau me-restart
MySQL/PHP-FPM/worker pembayaran melalui deployment web biasa.

## Profil yang dipasang operator

```dotenv
RAPAT_PYTHON=/opt/siperp-rapat/runtime/venv/bin/python
RAPAT_MODEL_DIR=/opt/siperp-rapat/runtime/models
RAPAT_WHISPER_MODEL=small
RAPAT_OLLAMA_URL=http://127.0.0.1:11434
RAPAT_OLLAMA_MODEL=qwen3.5:0.8b-q8_0
```

Path di atas contoh; gunakan path runtime persisten yang benar pada server.
Jangan menyalin atau commit `.env` aktif. Default model notulen dalam kode tetap
9B; profil VPS memilih model kecil secara eksplisit. Tidak ada alias yang
menyamarkan model kecil sebagai 9B atau fallback otomatis.

Pada 23 November 2026 operator melaporkan Whisper small int8 dan Qwen3.5 0.8B
Q8 siap, worker active/running, NRestarts=0, serta web/database sehat. Model
Qwen3.5 lulus smoke test sintetis keputusan/PIC/tenggat dan transkrip minim.
Qwen2.5 1.5B gagal (pembahasan tambahan dan ucapan penutup dianggap tugas),
sehingga tidak dipilih. Percobaan prompt ekstraktif tidak diterapkan ke engine.
Ini laporan kesiapan dan uji awal, bukan bukti akurasi rapat panjang atau
keberhasilan perekaman hingga notulen melalui aplikasi. Periksa notulen terhadap
sumber sebelum finalisasi, khususnya nama, keputusan dan tenggat.

## Dependensi dan model

Ikuti [panduan engine](../../docs/rapat-local-ai.md). Buat venv terpisah, pasang
`tools/rapat/requirements.txt`, lalu unduh small secara eksplisit dengan setup.
Jangan memakai pip global atau mengunduh model ketika melayani request.
Runtime/model harus dapat dibaca dan Python dieksekusi oleh siperp serta pengguna
PHP-FPM. Jangan memberi akses publik ke audio, storage privat atau konfigurasi.

Ollama dipasang terpisah dari sumber resmi. File `ollama-rapat.conf` adalah
contoh drop-in khusus server Ollama yang melayani Rapat. Baca konfigurasi efektif
terlebih dahulu jika Ollama juga digunakan aplikasi lain. Pasang di
`/etc/systemd/system/ollama.service.d/90-siperp-rapat.conf`, lalu daemon-reload dan
restart hanya Ollama. Pull model lokal `qwen3.5:0.8b-q8_0` secara eksplisit.
File ini membatasi loopback, menonaktifkan cloud, satu model/permintaan, satu
vCPU dan RAM 2 GiB. Ukuran unduhan bukan kebutuhan RAM. Batas cgroup dapat
menghentikan proses jika terlampaui; ukur memori, swap, waktu proses dan latensi
web pada server target. Worker dan Ollama masing-masing mempunyai batas 2 GiB,
bukan satu anggaran gabungan. Satu job Rapat mengerjakan transkripsi dan notulen
berurutan; jangan menjalankan inferensi manual atau worker tambahan bersamaan.

Sebelum mengganti model aplikasi, jalankan `check_local_minutes.py` dengan
environment model pilihan; pertahankan assertion. Jangan menganggap JSON yang
valid sebagai bukti faktualitas atau melemahkan tes agar model lolos.

## Memasang worker

Prasyarat: release manager `/var/www/siperp-deploy/current`, akun siperp/group
www-data, PHP 8.4 CLI dengan pcntl, tabel rapat_jobs dan konfigurasi database queue
yang sudah dimigrasikan. Engine/model/configuration harus diperiksa terpisah.

Dari rilis yang sudah direview, sebagai root:

```bash
bash /var/www/siperp-deploy/current/ops/rapat/install-worker.sh
```

Installer memakai lock deployment dan menyimpan salinan file worker lama di
folder privat root. Ia menghentikan hanya worker Rapat secara graceful sebelum
mengganti helper/unit dan memulainya kembali. Stop bisa menunggu pekerjaan hingga
selesai; jangan memaksa kill untuk mempercepatnya. Drop-in operator dipertahankan:
periksa `systemctl cat siperp-rapat-worker.service` untuk override yang berbeda.
Drop-in `95-persistent-loop.conf` yang dipasang sebelumnya menunjuk wrapper yang
sama dengan Restart=on-failure, sehingga tetap kompatibel.

`run-worker.sh` menetap saat antrean kosong dan menjalankan PHP anak berulang.
`worker.php` me-resolve current pada setiap proses baru, memeriksa kesiapan dua
model, lalu memakai queue:work mode daemon dengan max-jobs=1/stop-when-empty.
Mode ini mempertahankan penanganan sinyal dan timeout Laravel (jangan mengganti
dengan --once). Satu pekerjaan berjalan sekaligus. Pekerjaan yang sedang berjalan
menyelesaikan versi yang sudah dimuat; proses selanjutnya memakai current baru.
Kompatibilitas migration tetap harus mencakup worker yang masih berjalan.

Job timeout 3600 detik lebih pendek dari retry_after 3900. Limit PHP 256 MiB tidak
membatasi Python; batas cgroup layanan berlaku ke seluruh proses turunannya.
Wrapper meneruskan SIGTERM dan menunggu PHP; SendSIGKILL=no menghindari pemaksaan
stop. Exit error diteruskan ke systemd; exit 78 menghentikan restart otomatis
untuk konfigurasi yang harus diperiksa. Antrean kosong bukan error dan tidak
menghabiskan StartLimitBurst seperti pola Restart=always per proses sekali jalan.
Helper menunggu tanpa mengambil job jika kedua mesin tidak siap. Jika salah satu
siap, API memeriksa kesiapan sesuai operasi yang diminta sebelum mengantrekan job. Active/running saja
tidak membuktikan model atau proses pembuatan notulen siap.

## Perubahan konfigurasi dan verifikasi

Backup `.env` secara privat sebelum mengubah hanya key Rapat. Setelah perubahan
environment, siapkan kandidat dengan commit aktif melalui release manager,
termasuk cleanup resmi bila slot penuh, dan aktivasi hanya setelah kandidat ready.
`update` dengan commit yang sama dapat menjadi no-op; `prepare` eksplisit diperlukan
untuk membuat cache konfigurasi baru. Jangan menyunting registry/hash agar lolos
review. Perubahan env dapat membuat rollback ke cache lama ditolak sampai
konfigurasinya direview. Jangan mengubah cache seluruh rilis atau menghapus data.

Periksa selected config dan `LocalEngine::run(['operation'=>'health'])` dari
bootstrap rilis aktif dengan user aplikasi. Hanya cetak path runtime, nama model,
dan boolean kesiapan; jangan mencetak keseluruhan config/env atau exception.
Jangan menghapus cache bersama hanya untuk menguji engine.

```bash
systemctl show siperp-rapat-worker.service -p ActiveState -p SubState -p NRestarts
journalctl -u siperp-rapat-worker.service -n 20 --no-pager
curl -fsS https://erp.lazsip.or.id/api/health
```

Kedua flag model harus true, web/database sehat, worker running dan restart count
tidak terus bertambah. Uji rapat pendek melalui aplikasi sebelum rekaman panjang.
File ops baru dari GitHub tidak otomatis menimpa helper global di /usr/local/lib;
pembaruan helper menggunakan installer eksplisit setelah review.

## Pemeriksaan lokal

### Diagnosa audio gagal

Jika pemeriksaan menunjukkan `stage=read_audio`, periksa file ciphertext dan izin
PHP-FPM (umumnya www-data) versus worker (siperp, group www-data). Adapter lokal
default membuat private file 0600/directory 0700; itu tidak memberi worker akses
ke upload yang dibuat PHP-FPM. Adapter khusus Rapat kini memakai file 0640 dan
directory setgid 2770 pada path yang sama. Plaintext sementara tetap 0600/0700.

Untuk rekaman lama, upload `ops/rapat/repair-audio-access.py` yang sudah direview ke
`/root/repair-audio-access.py`, lalu jalankan sebagai root:

```bash
python3 /root/repair-audio-access.py --apply
```

Tanpa `--apply` hanya menampilkan rencana. Skrip memegang lock deployment, menolak
symlink/hardlink/path di luar Rapat, membaca path upload aktif dari DB, menyimpan
audit mode/owner/group sebelumnya, dan memperbaiki hanya izin ciphertext terdaftar
serta direktori Rapat. Pada ancestor storage, ia hanya menambahkan group traverse
jika grupnya sudah www-data; tidak memberi listing/write baru. Konten file, DB,
APP_KEY, upload modul lain, dan backup tidak diubah. Upload yang hilang dilaporkan,
tidak dibuat ulang. Pemeriksaan akhir membaca audio sebagai user/group worker tanpa
inferensi. Jika tetap gagal, pertahankan output stage/exception untuk penelusuran.

ErrorException saja tidak mengidentifikasi penyebab: kegagalan read/decrypt,
mkdir/tempnam, atau izin logging sebelumnya dapat tertutup pesan generik.
Helper berikut memeriksa rekaman gagal terbaru, tanpa mengubah baris rapat/media
dan tanpa mencetak audio, transkrip, nama rekaman, atau pesan exception mentah:

```bash
runuser -u siperp -- /usr/bin/php8.4 /var/www/siperp-deploy/current/api/tools/check-rapat-audio.php
```

Tambahkan `--transcribe` untuk menguji audio tersebut dengan model, ketika tidak
ada rapat yang sedang diproses. Inferensi memakai CPU/RAM; jangan menjalankannya
bersamaan dengan worker yang sedang memproses. Periksa `stage` dan `reason` pada
output serta event `rapat_processing_failed` di log aplikasi (atau journal worker
jika file log tidak dapat ditulis). Jangan membuka storage publik atau chmod 777.

Direktori plaintext kini berada di temp OS per-user (`siperp-rapat-<uid>`), 0700;
file 0600 dan dibersihkan melalui finally. `PrivateTmp=true` tetap dipertahankan.
Storage audio terenkripsi lama tidak dipindah, dihapus, atau dilonggarkan izinnya.
Jika tahap read_audio gagal, periksa kepemilikan/ACL jalur audio terenkripsi dan
identitas PHP/worker secara spesifik sebelum memperbaiki izin. Pemeriksaan health
model bukan bukti worker dapat membaca audio upload.

```bash
node --test tests/rapat-worker.test.cjs
php -l ops/rapat/worker.php
bash -n ops/rapat/run-worker.sh
bash -n ops/rapat/install-worker.sh
```

Tes wrapper memakai proses tiruan, tanpa systemd, database, model atau VPS.
Uji systemd/cgroup dan alur aplikasi tetap dilakukan pada server target.

## Pembaruan alur transkripsi terpisah

Worker mendengar `rapat-transcription,rapat` pada koneksi database Rapat yang sama.
Transkripsi masuk antrean khusus agar worker versi lama yang hanya mendengar
`rapat` tidak mengambilnya sebagai pekerjaan pembuatan notulen. Setelah deploy
perubahan ini, jalankan installer worker secara eksplisit; update web saja tidak
menimpa helper global. Selama helper belum diperbarui, job transkripsi baru tetap
mengantre. Jangan menjalankan worker paralel atau memindahkan job ke antrean lama
untuk melewati pembatasan tersebut. Tidak ada perubahan schema database.
