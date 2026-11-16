# PWA Insan Academy

Academy dapat dipasang dari menu Pasang Aplikasi peserta/pengajar atau /academy/pasang. Manifest: /academy/manifest.webmanifest. Service worker: /academy/sw.js, scope /academy/.

Aplikasi diluncurkan ke /academy/lanjut, memakai akun serta sesi Core/Sanctum dan pengalihan peran yang sudah ada. Panel /admin/academy berada di luar scope PWA.

## Pemasangan

- Android Chrome/Edge: lewat HTTPS, pilih Pasang pada halaman pemasangan atau menu browser > Instal aplikasi/Tambahkan ke layar utama.
- iPhone/iPad Safari: Bagikan > Tambahkan ke Layar Utama.
- Dukungan tombol pemasangan bergantung browser. Localhost didukung saat development; HP fisik memerlukan HTTPS yang dapat diakses perangkat.

## Koneksi dan privasi

Worker menyimpan hanya halaman offline generik dan ikon publik dalam cache academy-pwa-public-*. HTML akun, API, audio privat, materi, soal, jawaban, serta POST/server action tetap memakai jaringan. Navigasi gagal saat offline menampilkan halaman koneksi terputus. Ini bukan mode belajar/ujian offline; formulir belum terkirim tidak dijanjikan tersimpan otomatis.

Notifikasi popup/background belum termasuk. Pengingat dalam web tetap tersedia. Worker tidak meminta izin notifikasi atau memasang Firebase.

Pembaruan worker menunggu persetujuan pengguna; tombol Perbarui meminta memastikan pekerjaan sudah tersimpan, tanpa reload otomatis ketika ujian berlangsung.

## Deployment dan pengujian

Tidak ada migration, key, atau dependensi baru. Build/deploy frontend bersama public/academy-pwa dan public/academy/sw.js. Proxy harus melayani file tersebut dan manifest dari Next.js, bukan Laravel. Pertahankan HTTPS dan header worker dalam next.config.ts. Scope dan cache PWA Bantuan tetap terpisah.

Jalankan node --test tests/academy-pwa.test.mjs. Setelah deploy uji pasang di HP, launch ikon, login, materi/ujian/tanya jawab, logout, pergantian akun, fallback offline dan pembaruan ketika ada formulir. Pastikan API dan halaman privat tidak masuk Cache Storage. Instalasi HP fisik tetap perlu diverifikasi di HTTPS.
