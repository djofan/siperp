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
  60 detik selama layar terlihat. Ini notifikasi dalam aplikasi, bukan Web Push.
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
  aplikasi, dan logout. Tidak ada perubahan skema atau migration pada fitur ini.

## Batas tahap pertama

Belum ada Web Push/background notification atau dukungan transaksi offline
penuh. Pengelolaan akun, master data, persetujuan lengkap, dan laporan lintas
modul tetap tersedia melalui dashboard web.
