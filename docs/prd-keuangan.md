# Rancangan modul Keuangan SIPERP

Status: fondasi dan workflow input/revisi pengeluaran serta approval telah dibuat secara lokal.
Belum ada impor ke SIPERP, eksekusi migration pada database pengguna, atau deployment.
Rincian tahap implementasi: [Fondasi Keuangan](../modules/keuangan/README.md).
Implementasi terbaru dan keputusan bisnis 17 November ada di `modules/keuangan/README.md`.
Pemetaan/rancangan awal di bawah dipertahankan sebagai referensi; keputusan terbaru:
revisi pengeluaran membentuk round baru, keputusan boleh direvisi dengan alasan,
penolakan menutup tugas lain. Resource yang belum diimplementasikan tetap rancangan.
Tanggal: 16 November 2026. Acuan SIPERP: checkout `cd5e82d`.

Modul Keuangan akan membawa pencatatan pengeluaran dan approval dari aplikasi lama
ke frontend Next.js serta backend Laravel SIPERP, dengan login Core yang sama.
Riwayat keuangan dipertahankan; akun dan hak akses dipetakan sebelum impor.
Pencatatan pengeluaran lama tidak otomatis menjadi bukti pembayaran atau mutasi bank.

## Sumber dan hasil pemetaan

Pemeriksaan memakai kode asli `keu.zip`, struktur serta baris referensi dari backup SQL,
dan arsitektur SIPERP. Aplikasi standalone hasil upgrade sebelumnya hanya menjadi
pembanding kompatibilitas, bukan aplikasi yang dipasang ke dalam iframe SIPERP.

- 15 tabel lama: 7 tabel bisnis, 5 tabel identitas/otorisasi, dan 3 tabel teknis.
- 5 peran lama, 25 permission, serta relasi akun yang dapat memiliki lebih dari satu peran.
- Semua relasi FK dan pivot dalam snapshot berhasil direkonsiliasi; tidak ditemukan
  referensi yatim atau pasangan pivot duplikat pada pemeriksaan tersebut.
- Snapshot memiliki transaksi tanpa approval; import mempertahankan keadaan ini.
- Tidak ada tabel pembayaran, jurnal debit/kredit, saldo awal, rekening bank, bukti
  transfer, attachment transaksi, atau audit keputusan append-only pada schema lama.

Ringkasan jumlah baris dan kualitas data disimpan privat di
`C:/Users/a/keu-migration/legacy-mapping-audit.json`, bukan sebagai data aplikasi/repo.
Dokumen repository ini tidak memuat nama akun, email, password, penerima, nominal
transaksi, SQL, atau kunci aplikasi.

Dokumen pendamping:

- [Peta tabel dan rancangan relasi](keuangan/rancangan-data.md)
- [Rencana migrasi dan syarat penerimaan](keuangan/rencana-migrasi.md)
- [Daftar fitur](keuangan/pemetaan-fitur.csv)
- [Pemetaan seluruh tabel lama](keuangan/pemetaan-tabel.csv)
- [Matriks 25 izin lama](keuangan/matriks-izin-lama.csv)

## Fitur yang dibawa

| Area | Perilaku yang ditemukan di aplikasi lama | Tujuan dalam SIPERP |
| --- | --- | --- |
| Beranda | Sambutan setelah login; bukan dashboard saldo | Landing modul dan akses kerja sesuai izin; statistik baru diberi definisi tersendiri |
| Pengeluaran | Daftar, cari penerima/nominal, urut, halaman, tambah, detail, edit, hapus | Daftar/detail/form pengeluaran Keuangan |
| Approval saya | Penugasan milik akun login; setuju/tolak dan catatan penolakan | Daftar tugas approval pribadi, detail dan aksi yang diotorisasi backend |
| Sumber dana | CRUD label sumber; tidak dapat dihapus jika dipakai pengeluaran | Master sumber dana, tidak dianggap rekening bank |
| Kategori | CRUD label kategori; tidak dapat dihapus jika dipakai | Master kategori |
| Aturan approval | Rentang nominal dan daftar akun penanggung jawab | Aturan rentang nominal dan approver; snapshot penugasan pada transaksi |
| Cetak | PDF detail pengeluaran dan persetujuan | Endpoint unduh PDF privat dengan policy yang sama dengan detail |
| Ekspor | XLSX: sumber, kategori, penerima, nominal, deskripsi, approver/status, waktu | Ekspor privat; filter sumber/kategori dan hak baca diperiksa server |
| Akun/peran | Users, Roles, permission_role, role_user | Identitas dan kredensial melalui Core; grant Keuangan tetap terbatas modul |
| Profil | Edit nama, username, email, password dengan password lama | Profil akun Core; alias username lama tidak otomatis menjadi kode login |
| Login/logout | Session Laravel mandiri | Cookie/API Sanctum dan namespace kode akun Core |

Tidak ditemukan pengiriman uang, sinkronisasi bank, jurnal akuntansi lengkap,
push notification yang benar-benar dipanggil kode, atau approval bertingkat berurutan.
Dependensi Composer saja bukan bukti sebuah fitur sudah ada.

## Peran lama dan pemetaan hak akses

Peran adalah gabungan permission, bukan tingkatan jabatan otomatis. Matriks CSV
memuat grant persis dari backup. Aturan kepemilikan approval berlaku terpisah.

| Peran lama | Grant yang ditemukan | Kandidat peran modul | Pembatasan penting |
| --- | --- | --- | --- |
| Super Admin | Seluruh 25 izin dalam aplikasi keuangan lama | `admin` Keuangan | Bukan Superadmin Core; tidak memberi akses modul lain |
| Admin Keuangan | CRUD pengeluaran, sumber, kategori, aturan; akses approval | `finance_admin` | Tidak otomatis memperoleh kelola akun Core; grant users/roles tidak ada di role lama |
| Bendahara | Baca pengeluaran, sumber, kategori, aturan, akun/peran; akses approval | `treasurer` | Tidak otomatis diberi membuat/mengedit pengeluaran atau membayar dana |
| Ketua | Baca pengeluaran dan akses approval | `approver` | Keputusan hanya pada penugasannya, bukan seluruh approval |
| Admin Operasional | Baca/buat/edit/hapus pengeluaran | `operator` | Tidak otomatis mendapat akses master, aturan, akun, atau approval |

Semua role yang memiliki `access-expenses` pada kode lama dapat membaca daftar
pengeluaran umum; tidak ditemukan filter pembuat. Jangan menyatakan ada batas
"hanya transaksi sendiri" atau menciptakan pembuat transaksi historis.
Pembatasan per divisi/cabang/pembuat merupakan perubahan kebijakan baru.

Core saat ini menyimpan satu peran utama per modul dalam `module_access` dan
menghasilkan `moduleRoles[slug]`. Gabungan role lama tidak boleh disimpan sebagai
beberapa peran Core yang kemudian saling menimpa. Usulan: satu peran utama Core,
serta profil/grant Keuangan yang menyimpan gabungan izin lama yang diizinkan.
Perubahan peran Core harus memvalidasi ulang atau mencabut grant modul yang lama.

`finance_admin` sengaja berbeda dari literal `admin`: layanan ManagedAccounts Core
memberi kemampuan pengelolaan akun modul kepada role `admin`. Memberi role itu
kepada Admin Keuangan lama akan memperluas haknya. Akses baca akun/peran lama bagi
Bendahara dipenuhi oleh daftar anggota Keuangan dengan field minimal, bukan membuka
daftar seluruh akun lintas modul. Akun Superadmin Core yang sudah ada tidak diganti.

## Alur approval yang benar-benar ada

1. Pengeluaran dibuat dan disimpan dalam transaksi database.
2. Sistem memilih aturan yang rentangnya mencakup nominal, lalu mengambil daftar
   guarantor. Batas bawah dan atas bersifat inklusif.
3. Jika ada guarantor, dibuat satu penugasan `Waiting` per akun. Tidak ada urutan
   tahap atau syarat "ketua setelah bendahara" di kode lama: tugas bersifat paralel.
4. Penanggung jawab membuka penugasannya sendiri dan memilih `Approved`/`Rejected`.
   Penolakan memerlukan catatan.
5. Penghapusan pengeluaran ditolak jika ada approval yang sudah dijawab. Jika semua
   masih Waiting, kode lama menghapus pengeluaran dan penugasan terkait.
6. Jika aturan tidak cocok/tidak memiliki guarantor, pengeluaran dapat tercatat tanpa
   penugasan. Kondisi ini bukan bukti persetujuan dan bukan bukti pencairan.

Status pada database berada di penugasan, bukan di pengeluaran:
`1 = Waiting`, `2 = Approved`, `3 = Rejected`.
Label ringkasan seperti "semua setuju", "menunggu", "ditolak", "tanpa penugasan"
adalah hasil turunan, bukan status pembayaran historis.

## Perilaku lama yang harus diperbaiki atau diputuskan

| Temuan kode lama | Dampak | Rancangan tindak lanjut |
| --- | --- | --- |
| FormRequest create/update memakai `Gate::any(create, edit)` | Izin membuat dan mengedit tidak sepenuhnya terpisah di endpoint tulis | Policy per aksi; jangan membawa bypass ini ke modul baru |
| Detail/update approval mengecek pemilik tetapi tidak mengulang `access-approvals` | Peran dan assignment dapat tidak selaras | Periksa permission, assignment, status akun dan modul pada setiap aksi |
| Keputusan approval bisa ditulis ulang; tidak ada log historis | Riwayat perubahan keputusan tidak dapat dibangun ulang dari snapshot | Catat baseline import; event baru immutable. Kebijakan revisi keputusan perlu ditetapkan |
| Edit pengeluaran tidak mengunci ketika approval sudah dijawab; tidak menghitung ulang approver | Nominal/isi bisa berubah tanpa approval baru | Usulan versi transaksi + pembatalan/revisi persetujuan; memerlukan keputusan bisnis |
| `first()` pada aturan tanpa prioritas eksplisit | Jika aturan overlap, pemilihan tidak deterministik | Tolak overlap dengan pemeriksaan interval menyeluruh dan lock transaksi |
| DuplicateRange hanya mengecek endpoint rentang | Rentang baru yang seluruhnya di dalam rentang lama dapat lolos | Uji kondisi irisan `lama.min <= baru.max AND lama.max >= baru.min` |
| Mengubah/hapus aturan tidak mengubah penugasan yang sudah dibuat | Aturan kini tidak menjelaskan semua keputusan historis | Pertahankan assignment dan snapshot aturan untuk transaksi baru |
| Tidak ada tanggal bayar, pembuat transaksi, audit event lengkap | Informasi tersebut tidak dapat disimpulkan dari created_at/updated_at | Simpan unknown/null dan provenance, jangan mengarang riwayat |
| Hapus master/akun masih bergantung relasi/FK dan hard delete | Risiko putus riwayat saat diintegrasikan | Nonaktifkan/arsipkan yang sudah direferensikan; identitas ikut Core |

Temuan ini berasal dari inspeksi kode, bukan bukti bahwa penyalahgunaan pernah terjadi.
Belum ada perubahan runtime untuk memperbaikinya dalam tahap pemetaan ini.

## Batas dengan Keuangan Core yang sudah ada

SIPERP sudah memiliki `/admin/super/keuangan`, `core_expenses`, `core_bank_lines`,
dan rekening di `payment_destination_accounts`. Fitur tersebut mencatat pengeluaran
berbukti/rekening serta rekonsiliasi mutasi, bukan permohonan dan approval lama.

- `sources.name` lama adalah label dana, bukan `account_id` rekening bank.
- `expenses` lama tidak memiliki referensi bukti unik, rekening, pembuat, tanggal
  pembayaran, atau bukti settlement yang dibutuhkan alur Core.
- `Approved` tidak berarti dana dibayar. Jangan menyalin seluruh pengeluaran lama
  ke `core_expenses`, dan jangan menambah/mengurangi saldo dari hasil approval.
- Catatan Bantuan dan pembayaran iPaymu juga tetap berada pada domainnya; tidak
  dilakukan sinkronisasi otomatis atau pencatatan ganda pada tahap awal.
- Jembatan ke Core kelak memerlukan bukti pembayaran, pemetaan rekening eksplisit,
  referensi unik, idempotensi, serta keputusan pemilik proses. Itu tahap terpisah.

## Struktur integrasi yang diusulkan

- Slug modul `keuangan`, nama tampilan Keuangan; awalnya nonaktif sampai lolos uji.
- Routing tampilan `/admin/keuangan` dan subhalamannya, terpisah dari Keuangan Core.
- `app/` hanya re-export/routing; UI dan server action tipis di `modules/keuangan/`.
- Kontrak tipe di `contracts/modules/keuangan.ts`.
- Backend `api/app/Modules/Keuangan/{Models,Services,Policies,Http,routes,Providers}`.
- Route API `/api/v1/keuangan/*`, terlindungi auth Sanctum, user aktif,
  `module.access:keuangan`, policy aksi, dan pembatasan baris untuk approval.
- Pendaftaran modul/provider, peran operasional, metadata menu, kode akun dan
  account management mengikuti Core; tidak menambah login/session database mandiri.
- Migration baru additive dengan prefix `keuangan_`; migration lama tidak diedit.
- Privasi: penerima, catatan, laporan, permission dan data keuangan bukan endpoint publik.
  DTO eksplisit; password/hash, kredensial dan token tidak dikirim ke browser/log.

Contoh resource kontrak, seluruhnya masih rancangan dan belum endpoint aktif:

| Resource | Operasi awal |
| --- | --- |
| `keuangan/expenses` | GET daftar; POST buat; GET/PATCH `/{id}`; aksi arsip sesuai policy |
| `keuangan/approvals` | GET tugas saya; GET `/{id}`; POST `/{id}/decisions` dengan versi dan idempotency key |
| `keuangan/sources`, `keuangan/categories` | GET/POST; PATCH item; arsip master yang sudah dipakai |
| `keuangan/approval-rules` | GET/POST; PATCH/arsip; snapshot approver pada transaksi baru |
| `keuangan/reports/expenses` | Ekspor XLSX privat; GET `expenses/{id}/pdf` untuk cetak |
| `keuangan/members` | Daftar anggota/grant Keuangan sesuai capability; identitas tetap dibuat/dikelola Core |

Response envelope, kode HTTP, paginasi/filter allowlist, OpenAPI dan error mengikuti
`api/docs/CONVENTIONS.md`. Dokumen pemetaan ini tidak mendaftarkan kontrak baru
ke OpenAPI aktif karena resource-nya belum diimplementasikan.

## Keputusan sebelum implementasi alur tulis

Pemetaan sudah dapat dipakai untuk membuat fondasi dan importer dry-run. Keputusan
berikut memerlukan konfirmasi pemilik proses sebelum alur produksi dibangun:

1. Setelah satu approver menolak, apakah penugasan lain tetap terbuka atau ditutup?
2. Bolehkah keputusan berubah setelah dijawab; siapa dapat membuka revisi dan apa alasannya?
3. Apakah transaksi yang sudah dijawab wajib melalui revisi dan approval ulang saat diedit?
4. Bagaimana menangani transaksi historis tanpa penugasan, termasuk 11 kasus snapshot?
5. Pertahankan hak baca semua pengeluaran atau terapkan lingkup baru yang eksplisit?
6. Siapa akun lama yang dipetakan ke identitas Core mana, tanpa menaikkan hak lintas modul?
7. Kapan pengeluaran yang disetujui menjadi pembayaran aktual dan apa bukti/rekeningnya?

Belum ada penetapan ulang nama pemegang jabatan, merger akun, promosi Superadmin,
atau perpindahan data produksi. Implementasi dimulai setelah keputusan relevan
untuk tahap tersebut jelas.
