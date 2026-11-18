# Rencana migrasi Keuangan ke SIPERP

Status: rencana lokal. Tidak ada perintah deployment/import yang dijalankan pada VPS.

Pembaruan 18 November 2026: persiapan parser snapshot, audit sumber dan importer
CLI lokal tersedia di [panduan impor lokal](impor-lokal.md). Tahap penulisan hanya
diuji dengan fixture sintetis pada SQLite memory. Mapping akun nyata dan cutover
belum diterapkan. Rencana di bawah tetap menjadi kriteria perluasan berikutnya.

## Tahap 1 Pemetaan dan kontrak

Pemetaan fitur, 25 izin, 15 tabel, batas Core Finance dan pengecualian data sudah
tersedia pada PRD serta CSV. Putuskan kebijakan revisi transaksi/keputusan, lingkup
baca, dan penanganan tanpa approval sebelum mengaktifkan endpoint tulis terkait.

Tetapkan katalog permission dan satu peran utama Core beserta grant khusus modul.
Jangan menyamakan role Super Admin lama dengan SASIP01. Core saat ini hanya
mengizinkan satu Superadmin; pemindahan akun lama bukan alasan mengubahnya.

## Tahap 2 Fondasi lokal

1. Modul baru nonaktif secara default; migration additive untuk tabel keuangan_.
2. Provider, route protected, policy, DTO, metadata menu dan kontrak OpenAPI.
3. Tampilan Next.js, tanpa session/login Laravel mandiri atau akses SQL dari Next.
4. Tes backend memakai SQLite :memory: melalui api/phpunit.xml. Fixture sintetis,
   tidak menyertakan SQL asli, hash password, nama penerima atau akun pengguna.
5. Uji dry-run terhadap salinan privat dilakukan sebagai perintah audit terpisah
   yang read-only, bukan suite RefreshDatabase yang diarahkan ke database salinan.

Belum ada pekerjaan fondasi ini diterapkan oleh tahap pemetaan.

## Tahap 3 Identitas dan dry-run importer

Sumber identitas adalah akun lama dan Core, tetapi keputusan kesetaraan akun harus
melalui mapping privat yang ditinjau. Candidate matching email/username hanya
saran. Tidak mencocokkan nama secara otomatis atau mengambil alih akun Core.

- Akun Core yang sudah ada: pertahankan ID, password, status dan grant modul lain;
  tambahkan akses Keuangan hanya sesuai mapping yang disetujui.
- Akun baru: buat melalui layanan Core, namespace kode yang valid, peran lokal
  Keuangan, dan proses onboarding/reset terkontrol. Tidak menggunakan password bersama.
- Hash bcrypt lama hanya dapat dipertimbangkan untuk akun Core baru yang benar-benar
  terverifikasi dan dengan keputusan eksplisit; bukan default atau reset akun lama.
- Konflik username/email/reserved code, akun tanpa mapping dan grant tak dikenal
  menghentikan dry-run. Akun yang belum jelas tidak diaktifkan untuk mengambil keputusan.
- Identitas approver historis harus tetap dapat ditelusuri walau akun dinonaktifkan.
  Tidak menghapus/menyamakan akun demi lolos foreign key.

Format laporan privat importer: jumlah per tabel/status/sumber/kategori; calon
mapping; konflik; nominal total dalam integer; checksum; dan daftar ID bermasalah.
Tidak menulis password/hash, credential, isi transaksi penuh atau identitas ke log umum.

## Tahap 4 Import lokal yang dapat diulang

Urutan dependency:

1. Buat batch dan validasi hash snapshot serta schema sumber.
2. Resolve mapping identitas Core; jangan menimpa tabel users dari dump.
3. Impor master sources/categories; role/permission hanya ke namespace Keuangan.
4. Impor rules/guarantors sesuai mapping akun.
5. Impor expenses dengan referensi master dan provenance.
6. Impor assignment/status/note/timestamp; buat event baseline import yang jelas,
   bukan event approval seolah baru dilakukan sekarang.
7. Rekonsiliasi hasil lalu tandai batch completed; aktifkan akses hanya sesudah lolos.

Idempotensi memakai unique key `(origin_source, legacy_table, legacy_id)` dan
checksum canonical payload. `origin_source` mewakili sistem sumber yang tetap,
bukan nama file/hash dump yang berubah setiap ekspor. Dry-run berikutnya membedakan
unchanged, added, changed, missing, dan conflict. Missing bukan perintah delete;
changed pada baris yang sudah digunakan modul perlu review, bukan overwrite diam-diam.

Batch/chunk memiliki checkpoint, transaksi dan penanda status; kegagalan tidak
menyisakan relasi setengah jadi atau menyembunyikan batch yang belum lengkap.
Jangan replay aksi pengajuan, mengirim notifikasi, atau posting ledger saat import.

## Bukti penerimaan

| Area | Pemeriksaan yang harus lolos |
| --- | --- |
| Jumlah data | Cocok per tabel, sumber, kategori, status; semua pengecualian dijelaskan |
| Uang | Total dan subtotal rupiah exact; tidak overflow, tidak pembulatan/float |
| Relasi | Semua referensi master, assignment, akun dan grant terselesaikan |
| Histori | Status dan catatan lama tidak berubah; created/updated tidak diganti waktu import |
| Tanpa approval | Tetap ditandai tanpa assignment, tidak dianggap approved/paid |
| Akun | Mapping terverifikasi; tidak ada akun Superadmin tambahan atau reset Core tak sengaja |
| Hak akses | 25 izin dipetakan; role baca tetap baca; assigned-only untuk keputusan |
| Duplikasi | Menjalankan importer yang sama dua kali tidak menambah baris/grant/ledger |
| Modifikasi sumber | Snapshot baru dikenali sebagai update/konflik; tidak menimpa histori aktif diam-diam |
| Fungsi | Daftar/cari/filter, detail, aturan, transaksi, approval, profil, PDF/XLSX |
| Konkurensi | Dua keputusan/aksi bersamaan ditangani dengan lock, versi dan idempotensi |
| Isolasi | API modul lain, Payment/iPaymu, Bantuan, Core Finance dan sesi Core tetap sesuai |
| Privasi | Export dan detail berizin; data dump/env/hash tidak berada di repo atau endpoint publik |

PDF/XLSX dibandingkan dengan aplikasi lama menggunakan salinan privat, termasuk
hasil kosong dan volume besar. Memori dan batas waktu diuji sebelum rollout;
hasil tes standalone sebelumnya bukan pengganti tes integrasi modul.

## Tahap 5 Staging dan cutover kemudian

Setelah fondasi dan importer lokal selesai, siapkan staging privat dengan feature
flag modul nonaktif untuk pengguna umum. UAT melibatkan pemilik proses dan akun
sesuai perannya. Staging tidak mengirim uang, notifikasi keluar atau posting ledger
berdasarkan data historis.

Saat cutover yang dijadwalkan: hentikan input di sistem lama sementara, ambil backup
terakhir, dry-run dan rekonsiliasi delta, impor final, verifikasi akun/histori,
lalu aktifkan modul. Hosting lama dipertahankan sebagai fallback sesuai rencana
akses baca; jangan biarkan dua sistem menerima input tanpa mekanisme sinkronisasi.

Rollback release kode tidak mengembalikan database. Bila ada transaksi baru setelah
modul aktif, hentikan penulisan dulu dan rekonsiliasi delta sebelum berpindah kembali.
Jangan restore dump lama menimpa database SIPERP atau menghapus tabel/grant yang
sudah dipakai. Perubahan DNS dan penghentian hosting lama adalah langkah terpisah,
bukan bagian tahap pemetaan lokal ini.
