# PWA Bantuan SIP

Branch pengembangan: `feature/pwa-pengajuan`.

## Akses

- Buka `/bantuan-app/beranda`; akun tanpa sesi diarahkan ke `/bantuan-app/login`.
- Dashboard Bantuan memiliki tautan **Aplikasi mobile**.
- Login menggunakan kode akun dan password ERP melalui `/api/auth/login`.
  Cookie HttpOnly Core dipakai kembali. Tidak ada token autentikasi di localStorage,
  manifest, service worker, atau props browser. Endpoint mobile-token PR #53
  tetap tersedia bagi klien native, dan tidak diubah oleh fitur PWA.
- Akun harus aktif dan memiliki akses Bantuan. Guard server memeriksa sesi dan
  viewer modul; setiap request API tetap melewati otorisasi Laravel.

## Menu dan pekerjaan

- Beranda: ringkasan sesuai akses, santunan belum selesai, dan kabar terbaru.
- Tugas: verifikator melihat survei yang ditugaskan dan penyaluran; bendahara
  melihat pencairan serta penyaluran/pengembalian. Daftar berpaginasi, dapat
  dicari, dan detail memakai ActionPanel serta unggahan privat modul yang sama.
- Santunan: admin, bendahara, penyalur, dan ketua mengikuti izin modul yang ada.
  Penyalur hanya memperoleh santunan miliknya dari backend. Verifikator yang
  juga bertugas sebagai penyalur perlu peran Penyalur pada akun yang sama.
- Notifikasi: 50 terbaru, tandai satu/semua dibaca, dan buka pengajuan bagi
  pengguna yang memiliki menu Tugas. Badge disegarkan saat fokus dan setiap
  60 detik selama layar terlihat. Web Push terpisah dari polling ini; aktifkan
  lewat panel Notifikasi HP pada halaman Akun/Notifikasi.
- Akun: nama, kode akun, peran, panduan pemasangan, dashboard web, dan keluar.
  Keluar mencabut sesi melalui Core dan membersihkan draft lokal akun tersebut.

## Instalasi dan cache

Manifest berada di `/bantuan-app/manifest.webmanifest`, scope `/bantuan-app/`,
start URL `/bantuan-app/beranda`, dan mode standalone. Ikon biasa 192/512 px
serta ikon maskable disediakan. Viewport mendukung safe area dan tidak
menonaktifkan zoom. Navigasi bawah menyesuaikan jumlah menu pengguna.

Gunakan HTTPS pada deployment; localhost dapat dipakai untuk pengembangan.
Untuk mencoba di HP melalui alamat IP LAN, gunakan HTTPS dengan sertifikat
tepercaya agar pemasangan dan service worker bekerja. Buka dalam browser
utama: Android melalui menu pemasangan browser; iPhone melalui Safari >
Bagikan > Tambahkan ke Layar Utama. Ketersediaan prompt pemasangan bergantung
pada browser/perangkat dan status pemasangan sebelumnya.

Service worker `/bantuan-app/sw.js` hanya menyimpan halaman offline publik
serta ikon. HTML terautentikasi, respons API, foto privat, dan request mutasi
**tidak disimpan di Cache Storage**. Navigasi memerlukan jaringan; jika gagal,
service worker menampilkan halaman offline umum tanpa data akun. Form modul
menggunakan perilaku draft dan antrean foto terenkripsi yang sudah ada;
PWA tidak menambah penyimpanan privat baru atau antrean transaksi keuangan.

Pembaruan worker menunggu tindakan pengguna; ajakan memuat ulang mengingatkan
agar menyelesaikan formulir terlebih dahulu. Aktivasi hanya menghapus cache
berawalan `bantuan-pwa-shell-`, tanpa mengganggu modul lain. Ubah versi cache
ketika memperbarui offline shell atau ikon.

## Validasi

- `node --test tests/bantuan-pwa.test.mjs`: matriks akses, antrean tugas,
  isolasi cache, navigasi online dan fallback offline.
- `npm run typecheck` dan lint file terkait.
- `npm run build` untuk verifikasi route, manifest, dan bundel produksi.
- QA UI lokal menggunakan backend simulasi: verifikator, bendahara, penyalur,
  navigasi, form survei, notifikasi dan logout. Simulasi bukan pengganti uji
  menyeluruh terhadap Laravel/database dan perangkat HP nyata.
- Uji penerimaan dengan backend Laravel aktif sebelum deployment: login dengan
  akun yang diotorisasi, upload foto, simpan/kirim survei, catat pencairan,
  lengkapi laporan santunan, sesi kedaluwarsa, pemasangan Android/iOS, update
  aplikasi, dan logout. Migration Web Push menambah tabel langganan dan delivery.

## Batas tahap pertama

Belum ada dukungan transaksi offline penuh. Pengelolaan akun, master data, persetujuan lengkap, dan laporan lintas
modul tetap tersedia melalui dashboard web.

## Web Push PWA

Pengiriman memakai Web Push terenkripsi dengan VAPID melalui `minishlink/web-push`,
tanpa file Firebase privat di browser dan tanpa token ERP di service worker.
Langganan browser tersimpan terenkripsi di Laravel, terikat akun serta token sesi
Core yang sedang login. Browser bersama dipindahkan ke akun yang login berikutnya.
Keluar lewat PWA menghapus langganan dan menutup popup yang masih tampil; pencabutan
token Core juga menghentikan pengiriman berikutnya meskipun cleanup browser gagal.
Pesan yang sudah diterima layanan push sebelum logout bisa tetap tiba sesudahnya.
Notifikasi operasional memakai teks umum untuk privasi layar terkunci. Klik popup
selalu membuka inbox PWA dengan pemeriksaan sesi.

Scheduler memeriksa tiap menit, mengirim maksimal 50 notifikasi belum dibaca per
langganan per run, hanya yang dibuat sejak langganan aktif dan maksimal 7 hari.
Delivery sukses tidak dikirim ulang pada langganan/sesi yang sama. Gangguan sementara
dicoba ulang; langganan expired dihapus. TTL pesan pada layanan browser 5 menit.
Status berhasil berarti layanan push menerima pesan, bukan bukti HP menampilkan popup.

Deployment (belum otomatis diterapkan ke server publik):

1. Review/backup database, lalu `composer install --no-dev --optimize-autoloader`
   di folder `api` dan `php artisan migrate --force`. Migration baru:
   `2026_11_04_010000_create_bantuan_web_push` (2 tabel, tidak menghapus data).
2. Pastikan `storage/app/private` persisten dan tidak disajikan web server.
   Jalankan `php artisan bantuan:web-push-key` satu kali sebagai user deployment/PHP
   yang memiliki akses file. Command tidak menampilkan kunci dan tidak mengganti
   file yang sudah ada. Jangan menjalankan `key:generate`; pertahankan APP_KEY ERP.
   Backup file VAPID secara privat. Semua instance server memakai file yang sama.
   Bila perlu, atur `BANTUAN_WEB_PUSH_KEY_FILE` ke path privat persisten yang sama.
3. Set `BANTUAN_WEB_PUSH_SUBJECT` ke URL HTTPS organisasi, muat ulang config Laravel,
   dan pastikan ekstensi PHP OpenSSL, mbstring, curl serta akses HTTPS keluar tersedia.
   Pada PHP Windows, OPENSSL_CONF harus menunjuk konfigurasi OpenSSL yang valid
   jika OpenSSL tidak menemukannya otomatis. Jangan menampilkan kunci untuk debugging.
4. Pastikan cron menjalankan `php artisan schedule:run` setiap menit dari `api`
   (jangan buat cron kedua jika sudah ada). `schedule:list` harus memuat
   `bantuan:web-push`. Untuk pemeriksaan manual gunakan `php artisan bantuan:web-push`;
   command ini benar-benar mengirim notifikasi yang pending.
5. Build/restart frontend, restart worker bila relevan. Pada PWA yang sudah terpasang,
   selesaikan formulir lalu terapkan pembaruan service worker/muat ulang aplikasi.

Uji penerimaan di HTTPS dengan HP nyata menggunakan notifikasi operasional:

1. Login sebagai B, buka Akun/Notifikasi dan tekan **Aktifkan notifikasi HP**,
   lalu izinkan prompt browser. iPhone/iPad perlu iOS 16.4+ dan membuka PWA
   dari Layar Utama. Browser yang tidak mendukung akan menampilkan penjelasan.
2. Jalankan satu perubahan workflow yang menghasilkan notifikasi untuk akun B.
3. Jadikan PWA B background/tutup jendelanya, tunggu scheduler. B menerima popup,
   akun C tidak. Klik membuka inbox B. Periksa pengaturan OS/browser, izin situs,
   Jangan Ganggu, dan scheduler bila popup belum tampil. Force-stop browser/OS dapat
   menunda pengiriman; izin dan kebijakan perangkat tetap menentukan perilaku.
4. Tandai dibaca, nonaktifkan notifikasi, logout, serta login
   C pada browser yang sama: pesan B berikutnya tidak dikirim ke langganan C.

Tes otomatis memakai SQLite memory dan sender mock; tidak mengirim push ke HP nyata.
