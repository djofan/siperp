# PWA Bantuan SIP

Branch pengembangan awal: `feature/pwa-pengajuan`.

PWA kini memakai `Workspace` yang sama dengan dashboard web. Menu, formulir,
monitoring, peta survei, pin foto, dana, laporan, santunan, dan pengelolaan
mengikuti `navigation`/`canViewRoute` serta hak akses Laravel yang sama.
Navigasi bawah menyediakan Beranda, Pekerjaan (jika ada), Semua menu,
Notifikasi dan Akun. Semua menu membuka sidebar responsif; pencarian,
filter, kartu/tabel dan tindakan massal tetap tersedia.

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
  60 detik selama layar terlihat. Daftar dalam aplikasi tetap terpisah dari pengiriman Web Push.
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
  aplikasi, dan logout. Push PWA menambahkan migration tabel registrasi perangkat
  dan catatan pengiriman; jalankan migration saat deployment.

## Batas tahap pertama

Web Push tersedia setelah Firebase Web/VAPID dikonfigurasi dan pengguna
mengaktifkan izin. Dukungan transaksi offline penuh belum tersedia. Pengelolaan akun, master data, persetujuan lengkap, dan laporan lintas
modul tetap tersedia melalui dashboard web.

## Mengaktifkan push di VPS

Push PWA tetap memakai Firebase Cloud Messaging (FCM), sama dengan layanan yang
sudah berjalan. Tidak ada pemilihan atau perpindahan otomatis ke layanan Web Push
standar terpisah. Pertahankan konfigurasi Firebase dan VAPID yang sudah digunakan.

1. Pasang dependensi dari lockfile (`npm ci` pada frontend; `composer install`
   jika dependensi backend berubah), jalankan migration Laravel setelah backup,
   kemudian build dan restart layanan seperti deployment biasa.
2. Di Firebase project yang sama dengan service account server, daftarkan Web
   app dan ambil konfigurasi Web. Dari Cloud Messaging > Web Push certificates,
   ambil/generate pasangan VAPID dan gunakan **public key** di konfigurasi ini.
3. Isi `api/.env` (jangan masukkan ke Git):

   ```dotenv
   BANTUAN_FIREBASE_CREDENTIALS=/lokasi-privat/firebase-service-account.json
   BANTUAN_FIREBASE_WEB_API_KEY=
   BANTUAN_FIREBASE_WEB_PROJECT_ID=
   BANTUAN_FIREBASE_WEB_SENDER_ID=
   BANTUAN_FIREBASE_WEB_APP_ID=
   BANTUAN_FIREBASE_WEB_VAPID_KEY=
   ```

   Firebase Web apiKey/projectId/senderId/appId dan VAPID public key memang
   digunakan browser. File service-account dan private VAPID key tidak pernah
   dikirim ke browser atau dimasukkan dalam public/. Ikuti pembatasan API key
   Firebase yang sesuai project; jangan mengganti nilai dengan private key.
4. Jalankan `php artisan optimize:clear`, `php artisan bantuan:push-check`,
   dan `php artisan schedule:list`. `push-check` memeriksa OAuth/izin server,
   bukan membuktikan browser menerima pesan. Scheduler sudah memanggil
   `bantuan:push` tiap menit; pastikan cron VPS menjalankan Laravel
   `schedule:run` setiap menit, sebagai user layanan yang punya izin storage.
5. Pengguna membuka PWA melalui HTTPS, memuat ulang jika ada pembaruan, masuk,
   lalu memilih **Aktifkan notifikasi** di Notifikasi atau Akun. Izin hanya
   diminta setelah tombol ditekan. Pada iPhone gunakan PWA yang sudah dipasang
   ke layar utama melalui Safari; dukungan tetap mengikuti versi perangkat.
6. Buat notifikasi baru untuk akun tersebut **setelah registrasi**. Jangan
   tandai dibaca sebelum tes. Tutup/minimalkan PWA lalu tunggu scheduler, atau
   jalankan `php artisan bantuan:push` untuk mencoba antrean saat itu.
   Output sekarang membedakan jumlah push mobile dan PWA. Nol kiriman bukan
   bukti scheduler rusak: bisa tidak ada perangkat/notifikasi yang memenuhi syarat.

Push PWA memakai Firebase SDK untuk memperoleh token dengan service worker
`/bantuan-app/sw.js` yang sudah ada. Worker menangani Push API standar dan
payload FCM data-only, sehingga tidak ada tampilan otomatis sebelum validasi
sesi. Pesan Firebase Console tanpa binding aplikasi sengaja tidak ditampilkan.
Notifikasi layar kunci bersifat umum; tidak memuat nama, lokasi, nominal, atau
isi laporan penerima. Klik hanya menuju `/bantuan-app/notifikasi`.

Registrasi diperbarui saat PWA dibuka/fokus jika pengguna sebelumnya memilih
aktif. localStorage hanya menyimpan boolean preferensi, bukan token login.
Firebase SDK mengelola token perangkatnya sendiri. Registrasi ulang identik
menjaga tanggal awal dan tidak mengulang kiriman yang sudah tercatat.
Nonaktifkan push menghapus registrasi sesi serta subscription browser; izin
browser tidak dicabut otomatis. Logout menghapus registrasi PWA lalu mencabut
sesi Core. Jika jaringan gagal saat pembersihan, sesi yang sudah dicabut tetap
membuat pengirim menolak perangkat dan worker menolak pesan lama.

Worker memeriksa sesi cookie dan binding untuk setiap push. Pesan yang sudah
antre sebelum logout/ganti akun ditolak. Konsekuensinya, push tidak ditampilkan
bila backend tidak terjangkau atau sesi kedaluwarsa; isi tetap tersedia saat
login kembali. Pengiriman memiliki TTL singkat dan tidak dijamin saat perangkat
memblokir notifikasi, offline terlalu lama, atau memberlakukan batas baterai.
Token browser yang sama berpindah pemilik saat akun baru mengaktifkan push.

Validasi akhir di HP sungguhan memerlukan konfigurasi Firebase/VAPID dan VPS
HTTPS yang aktif. Uji juga izin ditolak, disable, logout, ganti akun, perubahan
izin modul, sesi kedaluwarsa, dan klik notifikasi. Jangan kirim kunci atau token
perangkat dalam tangkapan layar/log diagnostik.


## Kesetaraan dashboard web dan PWA

- `/bantuan-app/workspace/<menu>` memuat halaman dashboard yang sama melalui
  `Workspace`, bukan salinan antarmuka operasional yang berbeda.
- `/beranda`, `/tugas`, `/tugas/<id>`, `/santunan`, `/notifikasi` dan `/akun`
  tetap valid sesuai akses sebelumnya. Home relawan tunggal membuka Santunan;
  gabungan peran memakai dashboard. Tautan notifikasi lama tetap dapat dibuka.
- `WorkspaceNavigation` memetakan tautan/push/replace/prefetch internal Bantuan
  ke scope PWA, mempertahankan query dan fragment. URL API, ekspor, peta luar,
  dan modul lain tidak dipetakan. Tanpa provider, dashboard web tetap memakai
  URL `/admin/bantuan` seperti semula.
- Server memeriksa menu dengan policy web yang sama dan memeriksa izin edit
  terhadap pengajuan aktual. Laravel tetap memeriksa record, role dan versi
  untuk semua pembacaan/mutasi; URL PWA tidak memberikan hak tambahan.
- Push otomatis diregistrasi ulang hanya bagi pengguna yang sudah opt-in.
  Kontrol izin berada di Akun/Notifikasi. Push baru menyegarkan data tanpa
  membongkar formulir; 401 mengarahkan ke login PWA. Logout mencoba melepas
  registrasi perangkat sebelum mencabut sesi dan membersihkan draft lokal.
- Service worker tetap terbatas `/bantuan-app/`: API, foto privat dan halaman
  autentikasi tidak dimasukkan cache. Update menunggu pilihan pengguna agar
  draft tidak hilang saat mengisi formulir.
- Admin yang mengelola akun melalui Core tetap diarahkan ke pengaturan akun
  platform sesuai aturan web. Pemilihan modul lain memang keluar dari PWA.
- Tidak ada migration atau perubahan environment untuk kesetaraan tampilan ini.
  Deployment cukup build frontend dan restart setelah mengambil kode terbaru.
