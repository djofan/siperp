# Audit visibilitas pekerjaan Bantuan — 21 November 2026

Fokus audit: tugas yang membutuhkan tindakan tidak boleh hilang dari pekerjaan
pribadi, badge, atau daftar tujuannya. Ini audit kode dan pengujian lokal, bukan
pemeriksaan data/status akun VPS tertentu atau jaminan seluruh aplikasi bebas bug.

## Temuan dan perbaikan

- Menu Relawan pernah kehilangan metadata antrean; PR #162 menangani penyebab awal.
- Notifikasi diperbarui berkala, tetapi penghitung tugas tidak. Keduanya sekarang
  dibaca independen saat halaman terlihat, setiap 15 detik serta ketika kembali
  ke halaman. Gagal membaca pekerjaan menghasilkan status belum diketahui dan
  peringatan; tidak mempertahankan angka 0 yang seolah pasti.
- Badge penyerahan dan daftar tujuan memakai kondisi peran yang berbeda. Keduanya
  sekarang memakai `taskScope` yang sama, termasuk Relawan dan akun rangkap
  Bendahara/Verifikator. Otorisasi data tetap diperiksa Laravel.
- Penggabungan menu beberapa peran dapat menimpa metadata tugas dengan versi baca
  saja. Metadata task/source dipertahankan saat menu digabung.
- Tugas santunan belum masuk penghitung pekerjaan pribadi. Dashboard menambahkan
  penghitung transfer dan laporan sesuai peran/penugasan, tanpa membuka data baru.
- Admin dapat menghitung survei dua kali melalui tugas dan monitor survei. Monitor
  tidak lagi masuk jumlah pekerjaan Admin.
- Penghitung yang hilang/tidak valid tidak dianggap nol. Nilai 0 hanya berasal
  dari objek penghitung yang berhasil dibaca dengan status tanpa tugas.
- Daftar antrean diperbarui jika jumlah tugas berubah, tanpa me-refresh form detail
  yang sedang diisi. Respons lama tidak boleh menimpa hasil pembacaan yang baru.

## Bukti uji

- Matriks 11.264 kombinasi peran dan urutan peran: antrean penting tetap ada,
  route diizinkan, scope badge sama dengan daftar, dan status tidak dihitung ganda.
- Pengujian Laravel: penyerahan tertunda 35 hari tetap terlihat; tugas pihak lain
  tidak masuk antrean pribadi; santunan belum ditransfer/selesai dan penugasan
  pendamping dihitung sesuai akses.
- Browser lokal memakai data sintetis: angka 0 berubah menjadi 2 tanpa reload,
  kartu tugas muncul, filter pencarian bertahan, kegagalan API menjadi tanda belum
  dimuat, pulih setelah koneksi kembali, dan tampilan mobile tidak melebar.
- Tes kegagalan baca API menguji dashboard/notifikasi secara independen.
- Seluruh tes alur Bantuan dan suite frontend dijalankan; hasil akhir dilaporkan
  bersama perubahan. Typecheck sumber mengecualikan cache `.next/dev` yang rusak
  di lingkungan lokal; build produksi tidak disimpulkan lolos dari tes ini.

## Tambahan laporan LAZSIP

Form saldo campaign sebelumnya merender objek error API langsung sebagai child
React. Penolakan input dapat menjatuhkan halaman. Form sekarang memakai pesan
error terstruktur, mempertahankan isian yang gagal, melepas status tombol saat
koneksi putus, serta meminta pengecekan riwayat sebelum mencoba ulang ketika
hasil simpan tidak pasti. Ini tidak mengubah saldo atau menguji transaksi VPS.

## Penerapan dan batas pemeriksaan

Tidak ada migration baru. Backend dan frontend perlu diperbarui bersamaan agar
penghitung santunan tersedia. Klien yang menerima backend lama menampilkan jumlah
belum diketahui untuk santunan, bukan nol. Belum ada perubahan ke VPS dalam audit
ini. Untuk memastikan insiden akun tertentu, cocokkan role, penyalur, status terkini,
versi rilis, dan respons dashboard/list pada akun tersebut.

Hasil akhir lokal: 297 tes workflow Laravel lolos (3.105 assertion), matriks
peran mencakup 11.264 kombinasi, dan browser menguji refresh/offline/pemulihan.
TypeScript seluruh sumber lolos memakai tipe produksi yang digenerate dengan
mengecualikan cache development yang rusak; perintah typecheck standar tetap
memerlukan pemulihan cache tersebut. Pola error React yang sama diperbaiki pada
form berita, mitra, penerima bantuan, dan pendaftaran LAZSIP.
