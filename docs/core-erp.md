# ERP terpadu — superadmin

Halaman utama `/admin/super`, kontak `/admin/super/kontak`, keuangan `/admin/super/keuangan`, dan backup `/admin/super/backup`. Semua halaman, tindakan, ekspor, dan unduhan memeriksa status aktif serta peran superadmin terkini dari database, selain proteksi sesi Core.

## Dashboard

Filter tanggal menggunakan WIB. Dana masuk dan pengeluaran mengikuti periode; pekerjaan tertunda dan pendaftaran Academy menggunakan seluruh waktu, diberi label tersendiri. Penerimaan `simulation` dan `midtrans_sandbox` tidak masuk ke ringkasan keuangan. Academy menampilkan angkatan resmi, bukan angkatan simulasi. Angka bantuan menghitung catatan penerima per modul, bukan jumlah orang unik lintas modul dan bukan nominal pengeluaran bank.

## Kontak terpadu

Klik **Sinkronkan dari semua modul** untuk membaca donatur Payment, profil Academy, penerima SARSIP, pendaftar bantuan LAZSIP, serta penerima LAZSIP. Data sensitif seperti NIK, masalah pribadi, penghasilan, dan tanggal lahir tidak disalin. Identitas sumber disimpan di `core_contact_sources` sehingga sinkronisasi ulang tidak menggandakan sumber yang sama.

Nomor Indonesia dinormalisasi ke 62 dan email ke huruf kecil. Penggabungan otomatis memerlukan nama yang sama, nomor/email yang cocok, dan tidak ada konflik kontak. Nomor bersama dengan nama berbeda tetap dipisah. Sumber tanpa nomor/email tetap memiliki kontak sendiri. Gabungkan duplikat secara manual setelah memeriksa bahwa orangnya sama; semua sumber dipindahkan ke kontak tujuan, tabel asli modul tidak berubah. Catatan kontak sumber ikut dipertahankan. Koreksi nama/telepon/email di kontak terpadu tidak menulis ulang data asli modul; informasi asli dan waktu sinkronisasi ditampilkan di detail.

Sinkronisasi dilakukan atas permintaan, setelah pendaftaran/data modul berubah. Gunakan pencarian dan pagination untuk mengelola daftar. Penggabungan manual mengikuti pilihan operator dan dicatat pada riwayat aktivitas. Sumber yang sudah dihapus dari modul tetap disimpan sebagai riwayat sampai ada proses pengarsipan terpisah.

## Keuangan dan rekonsiliasi

Penerimaan berasal dari Payment yang sudah `paid`, bukan penjumlahan ulang tabel donasi dan zakat. Rekening dan jenis dana tetap terpisah. Nominal dana serta biaya admin ditampilkan terpisah; laporan arus bersih periode mencakup dana + biaya admin - pengeluaran tercatat. Ini bukan saldo bank karena saldo awal belum diinput, dan bukan buku besar akuntansi akrual.

Catat pengeluaran dengan rekening, tanggal, rupiah bulat, referensi bukti unik, dan keterangan. Catatan penyaluran/penerima pada modul tidak otomatis dicatat sebagai pengeluaran agar tidak menggandakan realisasi bank. Pengeluaran baru perlu dicocokkan dengan mutasi bank.

Impor CSV melalui template:

```csv
tanggal,referensi,keterangan,arah,nominal
2026-10-02,BANK-001,Donasi Jumat,masuk,100000
2026-10-02,BANK-002,Penyaluran bantuan,keluar,50000
```

Tanggal `YYYY-MM-DD`, arah `masuk`/`keluar`, nominal positif tanpa pemisah ribuan (maksimum tipe integer database 2.147.483.647). Batas 1 MB / 1.000 baris. Sel CSV bertanda kutip dan koma didukung. Validasi seluruh file dilakukan sebelum menyimpan, sehingga file salah tidak diimpor sebagian. Impor identik dilewati berdasarkan rekening, tanggal, referensi, arah, dan nominal. Referensi bank harus membedakan transaksi yang berbeda.

Pencocokan masuk memerlukan transaksi nyata yang sudah lunas dengan rekening dan nominal dana + biaya admin yang sama. Pencocokan keluar memerlukan pengeluaran dengan rekening dan nominal sama. Operator tetap memeriksa tanggal/referensi dan menulis catatan bukti; pencocokan tidak mengubah status pembayaran. Satu transaksi hanya dapat dipakai pada satu mutasi. Pencocokan dapat dibatalkan dengan alasan, dicatat pada riwayat aktivitas. Kandidat masuk dibatasi 100 per mutasi dan diurutkan menurut kedekatan tanggal.

Settlement gateway yang dipotong biaya atau digabung beberapa pembayaran belum didukung untuk pencocokan satu-ke-banyak; biarkan belum cocok sampai mekanisme settlement terpisah dikembangkan. Pembayaran simulasi/sandbox tidak dapat direkonsiliasi. Ekspor CSV mengikuti rekening dan periode, maksimal 10.000 baris per jenis; teks yang berpotensi menjadi formula spreadsheet dinetralkan.

## Backup dan pemulihan

`npm run erp:backup` atau tombol **Buat backup sekarang** membuat snapshot seluruh tabel InnoDB menggunakan consistent snapshot, lengkap dengan `public/uploads` dan direktori `ACADEMY_UPLOAD_DIR` (default `.academy-uploads`). Snapshot disimpan sebagai `.sipbak` gzip terenkripsi AES-256-GCM di `ERP_BACKUP_DIR` (default `.erp-backups`). Batas aplikasi 256 MB sebelum kompresi. File upload yang berubah saat dibaca menyebabkan backup gagal; hindari perubahan skema/upload aktif saat menjalankannya. File konfigurasi, source code, dan `.env` tidak ikut backup.

Kunci `ERP_BACKUP_KEY` berupa 64 karakter hex. Jika tidak dikonfigurasi, aplikasi membuat `.erp-backups/backup-key.local` sekali dan menggunakannya kembali. **Salin kunci ke penyimpanan aman yang terpisah dari backup.** Kunci tidak disertakan dalam unduhan atau snapshot. Batasi akses folder backup dan kunci pada akun layanan server. Jika menggunakan folder eksternal, periksa izin foldernya.

Unduh file terenkripsi dan simpan salinannya di media/server lain. Backup pada disk aplikasi saja tidak melindungi dari kehilangan server. Tombol **Verifikasi integritas** memeriksa autentikasi enkripsi, struktur snapshot, dan checksum setiap file. Verifikasi bukan pengganti latihan pemulihan.

Pemulihan dijalankan dari server, bukan tombol yang menimpa database aktif. Buat database dan folder kosong, salin backup serta kunci, lalu set `ERP_RESTORE_DATABASE_URL` secara aman di environment proses. Jangan memasukkan kredensial ke perintah atau log.

```powershell
node scripts/erp-backup.mjs restore <id-backup> --confirm-empty-target --files-dir <folder-kosong>
```

Pemulihan menolak database sumber dan database/folder target yang tidak kosong. Tabel dibuat dengan definisi asli, baris dimasukkan, jumlah baris diperiksa, dan file ditulis dengan proteksi overwrite. Jika gagal, database target dapat berisi tabel parsial; sumber tidak diubah. Pilih target kosong baru untuk percobaan berikutnya.

Hasil file: `<folder-kosong>/academy` dan `<folder-kosong>/public`. Setelah menguji hasilnya, arahkan `DATABASE_URL` dan `ACADEMY_UPLOAD_DIR` aplikasi ke hasil pemulihan, serta pasang isi folder `public` hasil pemulihan sebagai `public/uploads`. Konfigurasi layanan/email/payment berasal dari konfigurasi deployment yang disimpan terpisah. Tidak ada pemindahan database atau file aktif secara otomatis.

Untuk penjadwalan, jalankan `npm run erp:backup` melalui Task Scheduler/systemd/cron pada server dengan working directory proyek dan environment yang sama. Penjadwalan, retensi, serta salinan eksternal tidak diaktifkan otomatis pada komputer pengguna. Jika proses terhenti dan `create.lock` tertinggal, pastikan proses backup sudah berhenti sebelum menghapus lock.

Deployment memerlukan Node.js (bukan Edge), library MariaDB, script `scripts/erp-backup.mjs` dan `scripts/lib/erp-backup.mjs`, serta direktori backup/upload yang persisten. Konfigurasi tracing menyertakan script backup untuk halaman backup; data runtime dikecualikan dari bundel. Dataset lebih besar dari batas aplikasi memerlukan backup infrastruktur/database khusus.

## Setup dan pemeriksaan

```powershell
npm run db:setup:erp
node node_modules/prisma/build/index.js generate
node scripts/check-erp-pages.mjs
node scripts/check-core-erp.mjs
node scripts/check-erp-backup.mjs
```

Setup hanya menerapkan migrasi tambahan `20261002090000_core_erp`, tanpa reset atau menjalankan seluruh migrasi lama. `check-core-erp` menggunakan default server produksi lokal port 3001; ubah `ERP_TEST_URL` untuk server pengembangan. Script membuat fixture sementara dan membersihkannya, memakai akun aktif yang sudah ada tanpa mengubah password/peran. Sinkronisasi kontak asli tetap disimpan. Tes pemulihan memakai database lokal bernama `erp_restore_test_<acak>` dan folder `.erp-restore-test`, lalu membersihkan hanya target tersebut.
