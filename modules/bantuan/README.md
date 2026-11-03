# Pengajuan Bantuan — MVP internal

Modul mandiri bisnis dengan slug `bantuan`, tanpa dependensi implementasi
LAZSIP atau Payment. Identitas, login, dan izin modul menggunakan Core.

## Membuka modul

- UI: `/admin/bantuan`, login platform yang sudah ada.
- Superadmin otomatis mempunyai kontrol modul.
- Superadmin dapat memberi akses melalui Core. Admin modul dapat membuat
  anggota dengan akses hanya untuk Bantuan, bukan memberi akses modul lain.
- Akun operasional: admin, requester (Petugas Pengajuan), call_center,
  approver, verifier, volunteer (Penyalur), fund_requester, treasurer, chair.
  Satu akun approver; bypass default mati.
- Tidak ada route publik untuk data atau dokumen modul.

## Akun dengan beberapa peran

- Semua menu, antrean, dan tindakan dari peran yang diberikan tersedia
  bersamaan. Pengguna tidak memilih atau mengganti peran aktif.
- Izin setiap tindakan tetap diperiksa backend berdasarkan tahap, penugasan,
  dan kepemilikan pengajuan. Memiliki peran Approver tidak mengizinkan
  persetujuan pengajuan sendiri atau hasil survei sendiri.
- Tombol pilihan modul hanya ditampilkan untuk superadmin atau admin modul.
- Penambahan peran keuangan tidak membuka identitas dan dokumen privat
  pengajuan lain melalui peran lapangan yang cakupannya terbatas.

## Alur berdasarkan pembuat pengajuan

- Petugas Pengajuan: membuat pengajuan sendiri → langsung ke
  Approver → penugasan Verifikator oleh Call Center.
- Call Center otomatis dapat membuat pengajuan. Pengajuannya langsung
  menuju Approver, baik WhatsApp maupun datang ke kantor.
- Peran saat pembuatan dicatat pada `intake_role`. Perubahan akses, perbaikan
  data, dan membuka kembali pengajuan tidak melewati review yang wajib.
- Petugas Pengajuan hanya melihat pengajuan sendiri, melengkapi data yang
  dikembalikan, dan tidak dapat memberi keputusan atau memakai jalur langsung.
- Penyalur tetap menangani santunan yang ditugaskan. Nama peran sebelumnya
  diperbarui tanpa mengganti kode role, akun, maupun penugasannya.
- Jalankan migrasi `2026_10_30_000000_add_bantuan_intake_role.php` sebelum
  memakai alur ini. Data lama diisi dari peran pada catatan pembuatan.

## Survei, peta, dan review Call Center

- Hasil survei masuk `survey_cc_review`. Call Center memeriksa dan dapat
  menyimpan koreksi hasil survei maupun data pemohon, lalu mengirimnya ke
  `survey_submitted` untuk keputusan Approver. Bukti kunjungan asli dipertahankan.
- Verifikator dapat menolak tugas dengan alasan. Tugas kembali ke penugasan
  Call Center; Call Center juga dapat mengganti petugas saat survei berjalan.
- Call Center wajib menentukan alamat survei saat penugasan/penggantian verifikator.
  Alamat dan pin disimpan terenkripsi terpisah dari data pemohon. Perubahan alamat
  survei menghapus pin lama. Pengajuan lama tanpa alamat survei memakai alamat
  pemohon sampai Call Center menetapkan alamat kunjungannya.
- Di detail survei, Cek jarak mencari tujuan dari alamat survei melalui
  geocoder. Titik awal memakai GPS (atas izin pengguna) atau pencarian lokasi
  lain. Hasil ambigu dipilih pengguna; pin rumah dapat dikoreksi secara opsional.
  Peta vektor OpenFreeMap Positron menampilkan animasi rute jalan dari OSRM,
  jarak jalan dan estimasi waktu mobil tanpa lalu lintas langsung. Lokasi awal
  tidak disimpan. Pencarian menormalkan RT/RW dan singkatan alamat; hasil yang
  hanya cocok dengan kawasan ditandai sebagai perkiraan dan harus dipilih pengguna.
  Titik rumah tetap dapat disesuaikan pada peta. Jika alamat lengkap tidak cocok,
  pencarian mencoba nama jalan/tempat sebelum koma (tanpa nomor, RT/RW, blok,
  atau gang) melalui parameter street + postalcode, street tanpa kode pos,
  lalu pencarian bebas dan kawasan. Hasil alternatif tetap perlu dikonfirmasi.
  Endpoint `BANTUAN_GEOCODER_URL` dapat diganti; default Nominatim dibatasi
  satu pencarian per detik untuk seluruh aplikasi dengan cache terenkripsi 30 hari.
  `BANTUAN_ROUTER_URL` mengatur endpoint OSRM (default server demo publik),
  dengan pembatasan global satu permintaan per detik dan cache terenkripsi 6 jam.
  Ketersediaan server demo tidak dijamin; gunakan penyedia sendiri untuk kebutuhan
  produksi yang memerlukan jaminan layanan. Kegagalan rute ditampilkan sebagai
  pesan kesalahan, bukan diganti dengan garis lurus yang menyerupai rute jalan.
  Produksi multi-server harus memakai cache bersama untuk pembatasan global.
- Migrasi `2026_11_01_000000_add_bantuan_survey_cc_review.php` mengalihkan
  hasil survei lama yang masih menunggu keputusan ke review Call Center.

## Kartu pengajuan dana

- Menu **Pengajuan dana** tersedia untuk Pengaju Dana, Admin, Bendahara,
  dan Ketua. Pengaju Dana/Admin membuat kartu dari bantuan `fund_ready`.
- Checklist dapat mencakup beberapa halaman; total selalu dihitung ulang
  backend dari nominal yang telah disetujui. Kartu menyimpan rincian nominal
  saat diajukan sebagai riwayat.
- Keputusan dana dicatat untuk seluruh kartu. Pengajuan yang masih berada
  dalam kartu aktif tidak dapat diputuskan sendiri atau dipindah penyalurnya.
- Jalankan migrasi `2026_11_01_000000_create_bantuan_funding_requests.php`.

## Notifikasi WhatsApp Fonnte

- Jalankan migrasi `2026_11_01_010000_add_bantuan_whatsapp_outbox.php`.
- Di `api/.env`, isi `BANTUAN_FONNTE_TOKEN`, aktifkan
  `BANTUAN_WHATSAPP_ENABLED=true`, dan atur `BANTUAN_PUBLIC_URL` ke alamat
  HTTPS web yang bisa dibuka penerima. Token tidak disimpan di frontend.
- Hubungkan nomor pengirim di Fonnte. Admin mengisi nomor penerima dan
  mengaktifkan persetujuan notifikasi melalui **Tim & akses**.
- Jalankan scheduler Laravel setiap menit (`php artisan schedule:work`
  untuk pengembangan). Worker memproses antrean di luar permintaan web;
  pengingat tugas harian dijadwalkan pukul 08.00 Asia/Jakarta.
- Periksa konfigurasi tanpa mengirim melalui
  `php artisan bantuan:whatsapp --status`. Pengiriman dinonaktifkan sampai
  konfigurasi lengkap; pengujian memakai HTTP palsu tanpa pesan nyata.
- Panduan lengkap: [Konfigurasi WhatsApp](../../api/app/Modules/Bantuan/WHATSAPP.md).

## Cakupan Fase 1

- Form pemohon dan pelapor, draft parsial, duplikasi NIK berupa peringatan.
- Screening, review T1, penugasan survei, draft/koreksi survei, foto wajib,
  review T2, survei ulang, persetujuan nominal, dan jalur langsung.
- Penugasan penyalur, perubahan penyalur, penanda dana manual, persetujuan
  massal dengan nominal per item, serta penanda dana massal.
- Tiket pencairan diturunkan dari pengajuan berstatus fund_approved dan
  dikelompokkan per penyalur. Pencairan per item atau massal untuk satu
  Verifikator dengan total tervalidasi, rekening, tanggal, dan bukti.
- Bukti transfer/pengembalian sekali pakai per siklus. Mengganti penyalur
  setelah pencairan memerlukan bukti pengembalian, lalu pencairan ulang.
- Penyerahan dengan foto bantuan + sertifikat wajib; selisih nominal harus
  beralasan. Gagal salur dan pengembalian dana tercatat.
- Dashboard dasar, ekspor ringkasan CSV yang bisa dibuka di Excel, audit
  hanya-baca, notifikasi internal, master data, dan pengingat tenggat.
- Bendahara/admin dapat membuat periode bulan berikutnya dari seluruh santunan
  rutin bulan sumber. Penerima, kategori, penyalur aktif, dan nominal disalin;
  status, laporan, serta foto dimulai baru. Bulan tujuan yang sudah memiliki
  santunan rutin ditolak agar tidak ganda. Santunan tidak rutin tidak disalin.
- Foto di atas 2 MB dikompresi pada browser; server tetap memvalidasi
  format gambar dan maksimum 2 MB.

## Perlindungan dan batas operasional

- Payload pribadi pemohon, pelapor, survei, handover, alasan bypass, referensi,
  detail audit, dan isi file dienkripsi menggunakan Laravel Crypt/APP_KEY.
  NIK dicocokkan melalui HMAC. Nama, program, wilayah, serta status tetap
  tersimpan untuk pencarian dan agregasi.
- Dokumen ada di disk local privat; pembacaan melalui endpoint berotorisasi,
  bukan storage public. Role keuangan tidak menerima KTP, foto survei, atau
  payload survei; NIK disamarkan. Request file dicatat di audit.
- Audit tidak mempunyai API edit/hapus. Ini bukan penyimpanan WORM: pihak
  yang mempunyai akses database/infrastruktur tetap harus dibatasi.
- Keputusan memakai transaksi, row lock, serta version guard. Batch gagal
  seluruhnya bila salah satu item tidak valid.
- Backup ERP kini menyertakan direktori file privat Bantuan melalui
  kontribusi path generik. Untuk produksi, jadwalkan backup harian, salin ke
  lokasi terpisah, lindungi APP_KEY dan backup key, serta uji pemulihan.
  Jadwal/infrastruktur backup tidak otomatis diaktifkan oleh modul.
- `php artisan bantuan:remind` mengirim pengingat internal, dideduplikasi
  per penerima per hari. Scheduler Laravel harus berjalan untuk pengingat
  otomatis pukul 08:00 WIB.
- Gunakan HTTPS, pembatasan jaringan internal, kontrol akses server/database,
  retensi dokumen, serta monitoring sebelum memuat data pribadi sungguhan.
  Full internal tidak berarti bebas risiko kebocoran.

## Fase lanjutan / belum dibuat

Mengikuti roadmap PRD: notifikasi WhatsApp, template laporan penyaluran siap
salin, analitik waktu per tahap/kinerja lanjutan, ekspor XLSX/PDF asli, draft
offline persisten, dan integrasi web dana. Opsi 2FA pada login platform belum
tersedia; jangan menganggapnya sudah aktif. Persetujuan publikasi hanya
dicatat—tidak membuat halaman publik atau membagikan data.

Tidak ada transfer bank otomatis, pembuatan pengajuan dana di web sebelah,
akuntansi, atau pencetakan sertifikat.

## Instalasi dan pengujian

Migrasi tambahan: `2026_10_23_000000_create_bantuan_module.php`.
Tidak ada seeder data pribadi atau akun dengan password bawaan.

`api/tests/Feature/BantuanWorkflowTest.php` mencakup alur normal/bypass,
isolasi hak akses, masker data, enkripsi file, draft, batch atomic,
keputusan pertama, bukti wajib, role tunggal, dan pengingat.
Tes memakai SQLite in-memory; database aplikasi tidak di-reset.


## Feedback operasional November 2026

- Impor pesan WhatsApp pada pengajuan dan hasil survei menampilkan pratinjau sebelum diterapkan. Data pemohon dan pelapor dipisahkan; pelapor opsional. Field tetap dapat dikoreksi. Pengajuan datang langsung/bypass mendukung rincian asesmen awal.
- Semua Petugas Pengajuan menuju Approver. Hasil survei tetap diperiksa Call Center sebelum persetujuan nominal. Verifikator aktif otomatis menjadi penyalur setelah nominal disetujui; langsung masuk antrean dana. Jalur tanpa verifikator tetap membutuhkan penetapan penyalur.
- Call Center dapat memperbarui data pemohon setelah diproses, tanpa mereset status, nominal atau penugasan. Alamat lengkap wajib; provinsi/kota/kecamatan/kelurahan opsional dengan pilihan bertingkat.
- Pengingat survei default 5 hari, diubah admin melalui Pengaturan. Scheduler Laravel harus aktif untuk lonceng otomatis; gunakan scheduler deployment yang sudah ada. Tombol Ingatkan menyiapkan pesan WhatsApp ke nomor verifikator; pengguna menekan Kirim di WhatsApp. Tidak mengirim otomatis.
- Pilih semua pada pengajuan dana mengikuti filter, maksimal 100 per grup. Bendahara memeriksa nominal yang disetujui, tanggal/rekening dan bukti transfer opsional. Pendidikan menyediakan foto bukti lain opsional.
- Sertifikat menggunakan tiga template PDF yang disediakan, dengan nama, nominal, tanggal dan petugas yang dapat disesuaikan. Unduhan sertifikat tidak menyelesaikan penyerahan secara otomatis.
- Dashboard memuat kontribusi akun. Laporan admin dapat diekspor menjadi XLSX dengan ringkasan dan rincian, format nominal, filter dan header tetap. Lembar pertama Rekap permohonan mengikuti screenshot acuan: kop LAZSIP, hari/tanggal, nama/alamat pemohon, masalah, pelapor, tiga kolom status dan keterangan. Dibantu hanya untuk completed; Tidak dibantu untuk penolakan/pembatalan/dana kembali; Ditunda untuk needs_data. Tahap lain tetap kosong pada tiga kolom hasil, dijelaskan di Keterangan.
- Kontrak tambahan: `api/docs/bantuan-settings.openapi.json`. Pilihan wilayah memakai layanan wilayah yang telah digunakan platform; jika layanan gagal, alamat lengkap tetap dapat disimpan.
## Cetak kertas bantuan

Tombol **Cetak kertas bantuan** tersedia pada setiap santunan rutin, untuk
Janda dhuafa, Anak yatim, Anak asuh, dan Lembaga Tahfidz. Template dipilih
otomatis berdasarkan kategori. Kategori tahfidz tersedia dalam form tambah
santunan rutin; santunan tidak rutin tetap hanya untuk anak yatim dan tidak
menggunakan template berjudul rutin.

Nominal, nama penyalur/verifikator, serta nama penerima mengikuti data santunan.
Tanggal mengikuti laporan jika tersedia, atau hari ini, dan dapat diganti
sebelum mengunduh tanpa mengubah laporan. Jika nama penyalur tidak tersedia,
tombol tetap terlihat dan dialog menjelaskan masalah; unduhan diblokir sampai
identitas penyalur tersedia agar kartu tidak berisi nama yang salah.

Pratinjau, JPG, dan PDF memakai gambar yang sama. Nama panjang dibungkus agar
tetap di dalam kolom; nominal menyesuaikan lebar. PDF satu halaman berukuran
842,25 x 595,5 pt memakai gambar 2800 px. Hasil dibuat di browser; data penerima
tidak disimpan di aset publik. Background statis dalam
`public/bantuan/templates/` berasal dari PDF pengguna setelah nama dan nominal
contoh dihapus. Penambahan kategori ini tidak membutuhkan migration tabel.

## Aplikasi mobile / PWA

Aplikasi petugas tersedia di `/bantuan-app/beranda` dengan navigasi bawah dan
login cookie Core. Menu mengikuti hak akses akun. Panduan pemasangan, perilaku
cache privat, dan batas tahap pertama ada di `docs/bantuan-pwa.md`.
