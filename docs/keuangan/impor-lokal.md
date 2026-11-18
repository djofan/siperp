# Persiapan impor Keuangan lama — lokal

Implementasi 18 November 2026. Ini alat CLI lokal, belum berupa menu unggah web.
Tidak mengakses hosting lama/VPS, tidak mengganti kredensial, tidak memberikan
akses modul, dan tidak memposting transaksi ke Core Finance atau Payment.

## Yang dipindahkan

- Sumber dana, kategori, pengeluaran, aturan beserta guarantor, assignment dan
  keputusan terakhir, catatan serta timestamp lama.
- Identitas sumber tetap (`origin`), ID lama, checksum sumber/tujuan, hash dump,
  hash mapping, batch dan event baseline yang jelas merupakan impor.
- Akun lama hanya katalog referensi privat. Setiap akun yang dirujuk approval atau
  guarantor wajib dipetakan secara eksplisit ke ID akun Core yang sudah ada.
  Tidak melakukan pencocokan nama, membuat akun, menyalin password, menaikkan
  peran, atau mengimpor pivot izin lama secara otomatis. Akun yang tidak dirujuk
  tidak menjadi akun SIPERP dengan sendirinya.

Pembuat pengeluaran tetap `null`. Snapshot aturan yang menghasilkan approval
lama tidak diketahui sehingga tetap `null`. Riwayat revisi yang tidak tersedia
di sumber tidak dikarang. Waktu sumber dikonversi dari zona terverifikasi ke UTC;
backup sumber saat ini memakai **Asia/Jakarta**.

**Kebijakan tahap lokal:** aturan diimpor **nonaktif**, seluruh assignment historis
ditutup (`legacy_import`) tetapi keputusan Waiting/Approved/Rejected dan catatan
tetap dipertahankan. Tidak mengaktifkan tugas approval lama secara otomatis.
Pengeluaran tanpa assignment tetap tanpa assignment. Untuk memproses ulang suatu
pengeluaran nanti, pengelola meninjau aturan dan membuat revisi pengeluaran melalui
alur normal. Revisi tersebut memulai round baru dengan auditnya sendiri.

## Berkas privat

Gunakan direktori `.keuangan-import/` yang diabaikan Git. Jangan menaruh dump,
snapshot, mapping, identitas, laporan nominal, atau database percobaan dalam commit.

Dari root repo:

```powershell
python tools/keuangan/prepare_legacy.py "C:/lokasi/backup.sql" --origin keu-insanpeduli --timezone Asia/Jakarta --output .keuangan-import/snapshot-baru
```

Parser hanya membaca literal INSERT phpMyAdmin; tidak menjalankan SQL, DDL, trigger
atau stored procedure. Input terpotong/ekspresi INSERT ditolak. Password,
remember_token, token reset dan tabel teknis tidak diekspor. Semua angka dipertahankan
sebagai string desimal, penjumlahan rupiah tidak menggunakan float.

Hasil:

- `snapshot.json`: data bisnis dan katalog akun terbatas id/nama/username/email.
- `accounts.template.json`: ID lama → `null`. Salin menjadi mapping yang ditinjau,
  lalu isi ID akun Core yang benar. Dua identitas sumber tidak boleh digabung ke
  akun yang sama. `tables.users` di snapshot menjadi referensi pemeriksaan privat.
- `source-audit.json`: jumlah dan total rupiah exact dari sumber.

Nama sumber `origin` harus tetap sama untuk ekspor berikutnya dari sistem yang sama,
bukan diganti mengikuti tanggal atau nama file. Output tidak menimpa berkas lama.

## Audit sumber tanpa database tujuan

Dari direktori `api/`:

```powershell
php -d memory_limit=512M -d extension=gd tools/audit-keuangan-legacy.php ../.keuangan-import/snapshot-baru/snapshot.json ../.keuangan-import/snapshot-baru/source-dry-run.json
```

Alat ini memaksa tujuan **SQLite `:memory:`**, membuat schema minimal sementara dan
hanya menjalankan dry-run. Tidak membaca akun/database SIPERP. Laporan dapat berisi
`mapping_required` karena belum ada pemetaan akun tujuan; ini bukan bukti mapping
atau kecocokan data native sudah selesai. Tidak ada penerapan data nyata pada tahap ini.

## Simulasi terhadap salinan lokal SIPERP

Siapkan SQLite terpisah bernama `keuangan-import-*.sqlite` dengan schema SIPERP
terbaru dan akun Core uji yang sudah ditinjau. Pakai konfigurasi lingkungan lokal
terpisah, misalnya `.env.keuangan-import` (tidak di-commit): `APP_ENV=local`,
`DB_CONNECTION=sqlite`, `DB_URL=` kosong, `DB_DATABASE=` path absolut salinan tersebut.
Pastikan konfigurasi tidak di-cache untuk database utama. Jangan mengarahkan
`RefreshDatabase` ke salinan privat atau database pengguna.

Untuk snapshot penuh, gunakan batas memori CLI 512 MiB. Proses persiapan akun dan
audit snapshot dalam satu proses dapat melampaui batas PHP bawaan 128 MiB.
Pengaturan ini hanya untuk proses CLI lokal, bukan perubahan PHP VPS.

Dry-run default, dari `api/`:

```powershell
php -d memory_limit=512M artisan keuangan:import-legacy ../.keuangan-import/snapshot-baru/snapshot.json ../.keuangan-import/snapshot-baru/accounts.reviewed.json --env=keuangan-import
```

Laporan hanya berisi jumlah, total, hash dan ID konflik; tidak mencetak penerima,
uraian, catatan pribadi, email, atau kredensial. `reviewHash` mengikat isi sumber,
mapping dan hasil rekonsiliasi tujuan saat itu. Setelah hasil ditinjau:

```powershell
php -d memory_limit=512M artisan keuangan:import-legacy ../.keuangan-import/snapshot-baru/snapshot.json ../.keuangan-import/snapshot-baru/accounts.reviewed.json --env=keuangan-import --apply --review=HASH_DARI_DRY_RUN
```

Penulisan ditolak pada MySQL, lingkungan production, DB URL override, atau SQLite
yang tidak memenuhi penamaan salinan lokal. Migration baru hanya menambahkan tabel
batch/provenance; tidak memindahkan data, mengaktifkan modul atau mengubah grant.
Tidak ada endpoint HTTP baru; kontrak OpenAPI bisnis tidak berubah.

## Rekonsiliasi dan kegagalan

- `added`: belum pernah diimpor; `unchanged`: checksum sumber dan tujuan cocok.
- `changed`: baris sumber berubah. **Diblokir**, tidak overwrite.
- `missing`: ID yang sudah diimpor tidak ada pada snapshot baru. **Diblokir**,
  tidak delete. Snapshot parsial jangan dipakai sebagai ekspor lengkap.
- `target_modified`: transaksi/aturan/master hasil impor sudah berubah di SIPERP.
  **Diblokir**, revisi native tidak ditimpa.
- Konflik akun, referensi yatim, duplikasi ID/assignment, status tak
  dikenal, nominal tidak tepat, aturan overlap, aturan tanpa guarantor, dan token
  kedaluwarsa menghentikan penerapan. Nama master sama dengan data native tidak
  digabung otomatis.
- Nama master yang sama di dalam sumber dilaporkan sebagai warning dan tetap
  dipertahankan sebagai baris terpisah sesuai ID lama. Seluruh referensi transaksi
  tetap mengikuti ID, bukan nama. Warning terikat dalam token review.

Satu snapshot diterapkan dalam satu transaksi dengan lock modul yang sama dengan
workflow native. Kegagalan membatalkan seluruh batch. Ini belum memakai checkpoint
chunk lintas transaksi; snapshot besar perlu diuji kapasitas sebelum perluasan.
Jalankan dry-run ulang setelah apply: added harus nol, unchanged harus sesuai jumlah
baris bisnis, dan tidak ada penambahan assignment/event/batch pada penerapan ulang.
Aturan/assignment baru tidak dijalankan, notifikasi tidak dikirim, saldo tidak diubah.

Tes otomatis menggunakan fixture sintetis dan SQLite memory melalui phpunit.xml.
Audit snapshot asli disimpan privat dan terpisah dari fixture. Impor produksi,
UI mapping, aktivasi penugasan historis, pembuatan akun, pemindahan izin lama serta
cutover merupakan pekerjaan berikutnya setelah review akun dan UAT lokal.
