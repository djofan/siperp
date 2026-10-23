# Pengajuan Bantuan — MVP internal

Modul mandiri bisnis dengan slug `bantuan`, tanpa dependensi implementasi
LAZSIP atau Payment. Identitas, login, dan izin modul menggunakan Core.

## Membuka modul

- UI: `/admin/bantuan`, login platform yang sudah ada.
- Superadmin otomatis mempunyai kontrol modul.
- Superadmin dapat memberi akses melalui Core. Admin modul dapat membuat
  anggota dengan akses hanya untuk Bantuan, bukan memberi akses modul lain.
- Akun operasional: admin, call_center, approver, verifier, fund_requester,
  treasurer, chair. Satu akun approver; bypass default mati.
- Tidak ada route publik untuk data atau dokumen modul.

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
