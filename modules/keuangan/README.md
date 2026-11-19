# Tampilan Keuangan

Ruang kerja memakai tema krem `#f6e9d9` dan hijau `#043222`, navigasi responsif,
ringkasan, pengajuan terbaru, dan lonceng ringkasan approval milik akun. Dashboard
serta daftar approval memperbarui ringkasan setiap 60 detik saat tab terlihat;
halaman formulir tidak direfresh berkala agar pengisian tidak terganggu.
Lonceng ini merupakan ringkasan tugas saat ini, bukan penanda pesan belum dibaca.

Tampilan Bendahara berfokus pada rincian dan formulir keputusan. Tautan cetak
pengajuan disembunyikan dan route dokumen cetak menolak role `treasurer` sebelum
mengambil detail. Admin Keuangan dan role lain yang berhak masih dapat mencetak.
Panel penugasan/revisi approval di detail pengajuan dihapus dari tampilan;
data keputusan dan audit tetap dipertahankan. Halaman keputusan Bendahara tidak
menampilkan tautan pengeluaran/riwayat maupun panel riwayat.

# Perubahan pengajuan — 19 November 2026

Nominal pada formulir otomatis dikelompokkan menjadi `4.000.000`, tetapi field
`amount` yang dikirim ke API tetap `4000000` sebagai string tanpa float. Nilai paste
berdesimal/format ambigu ditolak, bukan ditafsirkan ulang. Nominal asli tidak diubah.
Pengajuan lama yang belum ditugaskan dapat dikirim secara eksplisit ke Bendahara
melalui `POST expenses/{id}/approval-requests` (version, requestId, treasurerId,
reason). Permintaan membentuk revisi baru tanpa mengubah fakta keuangan lama;
penugasan tetap menunggu sampai Bendahara memutuskan. Tidak otomatis memproses
arsip lama secara massal dan tidak dapat mengalihkan pengajuan yang sudah ditugaskan.


Dikerjakan di lokal. Formulir memakai empat kategori (Cash Advance, Kegiatan Sosial,
Operasional, Lain-lain), empat sumber (Kas Infaq, Kas Amil, Kas Riba, Kas Zakat), program,
deskripsi, nominal rupiah integer, penerima/identitas opsional, tanggal pengajuan,
dan Bendahara SIP yang dipilih. Program dimulai dari label kategori/program lama,
dengan referensi transaksi lama tetap dipertahankan; admin dapat menambah program.
Tanggal pengajuan lama yang tidak diketahui tetap kosong, bukan tanggal perkiraan.

Hanya role `treasurer` yang dapat menyetujui atau merevisi keputusan. Admin Keuangan,
admin modul, dan Superadmin tidak dapat menggantikan keputusan Bendahara. Pengaju
tidak dapat menyetujui sendiri. Pengajuan baru memakai penugasan Bendahara eksplisit;
revisi mempertahankan audit dan meminta approval baru. API klien lama tanpa kelompok
field program/tanggal/Bendahara masih mendukung aturan nominal, dengan eligibility
hanya Bendahara; tidak ada aturan berarti belum disetujui, bukan approval otomatis.
Pengajuan modern tidak dapat diturunkan ke mode lama melalui revisi.

Cetak per pengajuan: `/admin/keuangan/pengeluaran/{id}/cetak`, tersedia bagi semua
role Keuangan yang masih aktif. Dokumen mengikuti revisi terkini dan status sebenarnya;
ringkasan nama/keputusan penandatangan boleh dibaca seluruh role Keuangan untuk arsip,
sementara operator tetap tidak memperoleh detail catatan/audit approval.

Migration `2026_11_19_000001_add_keuangan_application_fields` menambah master program,
kolom nullable, menghubungkan program dari label lama tanpa mengubah sumber/kategori,
nominal, tanggal pencatatan, keputusan, atau identitas transaksi lama, serta menyiapkan
opsi kategori/sumber. Migration `2026_11_19_000002_retire_keuangan_chair_access`
mencabut akses role `approver` (Ketua), menutup penugasan menunggu dan menonaktifkan
aturan yang melibatkannya, serta mempertahankan semua keputusan/riwayat. Akun yang
punya akses modul lain tetap aktif. Tidak menghapus akun Core atau transaksi.
Review dan backup tetap diperlukan sebelum menjalankan migration di VPS.
Rollback tidak menghapus data tambahan atau mengaktifkan ulang akses yang dihentikan.

---

# Modul Keuangan

Persiapan importer lokal ditambahkan 18 November 2026: [panduan impor](../../docs/keuangan/impor-lokal.md).
CLI mendukung dry-run, mapping akun eksplisit, transaksi atomik dan provenance/idempotensi.
Penerapan dibatasi pada SQLite lokal terisolasi; belum ada impor pada database pengguna atau VPS.

Workflow lokal diperluas pada 17 November 2026; bagian fondasi 16 November dipertahankan sebagai catatan historis. Halaman `/admin/keuangan` memakai sesi Core dan
GET `/api/v1/keuangan/overview`. Modul didaftarkan **nonaktif** oleh migration
`2026_11_16_000001_create_keuangan_foundation`; akun dan transaksi tidak dibuat.
Core Superadmin dapat preview modul nonaktif sesuai middleware Core. Akun lain
memerlukan modul aktif, akun aktif, dan role Keuangan yang dikenali.

## Fondasi sebelumnya (16 November)

Fitur awal berikut telah diperluas oleh tahap workflow di bawah.

### Yang tersedia pada fondasi

- Provider Laravel, metadata peran akun operasional untuk pengelolaan akun Core.
- Ringkasan baca saja dengan Resource eksplisit dan `no-store, private`.
- Hitungan pengeluaran seluruh modul sesuai akses baca lama; tugas approval hanya
  milik akun login. Operator tidak memperoleh hitungan approval/master, Ketua
  tidak memperoleh hitungan master. Field yang tidak berizin bernilai null.
- Halaman responsif, status persiapan, angka kosong sebenarnya (bukan data demo).
- Tujuh tabel terpisah: sources, categories, expenses, approval_rules,
  rule_approvers, approvals, approval_events (semua berprefix `keuangan_`).
  FK membatasi penghapusan referensi; nominal BIGINT unsigned dan tanpa float.
  Snapshot aturan/aktor historis dapat null, tidak mengarang data sumber.
- Schema approval_events menyiapkan audit; append-only service dan penegakan
  revisi baru diterapkan bersama alur tulis, belum tersedia pada tahap ini.

## Peran dan batas tahap fondasi (historis)

`admin` mengelola modul/akun Core dalam cakupannya. `finance_admin` mengikuti
Admin Keuangan lama, tidak memperoleh pengelolaan akun. `treasurer` membaca
master; `approver` melihat jumlah tugas sendiri; `operator` membaca jumlah
pengeluaran. Semua endpoint bisnis tahap ini hanya GET. Tidak ada endpoint
impor, upload, CRUD, keputusan, ekspor, pembayaran, atau posting ledger.

Peran Core tunggal dipakai untuk fondasi ini. Gabungan 25 permission/55 grant
lama belum diimpor; desain role-user/staff dan provenance importer tetap menjadi
tahap berikut. Jangan memetakan akun multirole ke satu peran dan menganggap
migrasi haknya sudah selesai. Tidak ada adaptor login Keuangan tersendiri;
login tetap melalui `/admin/login`.

## Pemeriksaan dan penerapan berikutnya

Tes `KeuanganFoundationTest` memakai `api/phpunit.xml` (SQLite dalam memori).
Jangan menjalankan migration pada database pengguna untuk mencoba tes.
Dokumen API dihasilkan melalui `node api/tools/export-openapi.mjs`.
Migration belum dijalankan pada database lokal utama atau VPS. Aktivasi dan
pemberian akses kelak melalui Core setelah review schema dan backup.
Rollback migration menghapus tabel Keuangan dan menonaktifkan registrasinya,
namun tidak menghapus akun atau grant Core. Ini bukan rollback data produksi;
setelah ada data, jangan rollback schema tanpa rencana pemulihan.

Rancangan lengkap: [PRD](../../docs/prd-keuangan.md),
[peta data](../../docs/keuangan/rancangan-data.md),
[rencana migrasi](../../docs/keuangan/rencana-migrasi.md).

## Hasil verifikasi lokal

- KeuanganFoundation + AdminHierarchy: 27 tes, 216 assertion lulus di SQLite memori.
- Typecheck, lint frontend modul, Pint, sinkronisasi OpenAPI dan diff whitespace lulus.
- Suite Node: 248/249 lulus; kegagalan LAZSIP pada harness
  `lazsip-payment-notifications.test.mjs` tidak dapat resolve alias
  `@/modules/payment/components/GatewayHandoff`. Test dan dependensinya tidak
  berubah dari HEAD dalam pekerjaan ini.
- Build Turbopack lokal belum lulus: fetch Google Fonts dalam sandbox gagal;
  percobaan dengan jaringan kemudian gagal membuat proses PostCSS lokal.
- Build alternatif `npx next build --webpack` lulus, termasuk TypeScript dan generasi 187 halaman. Konfigurasi build proyek tidak diubah.


## Input pengeluaran dan approval (17 November 2026)

Implementasi lokal, belum deploy/migration pada database pengguna. Halaman utama
`/admin/keuangan`, dengan Pengeluaran, Approval Saya, dan Sumber/Kategori/Aturan.
Modul tetap nonaktif secara default; tidak membuat akun, transaksi demo, atau
mengimpor web lama. Superadmin dapat preview nonaktif, tetapi semua POST/PUT tetap
memerlukan modul aktif. Jangan aktifkan/migrasikan pada VPS sebelum review/backup.

### Hak akses

| Peran | Baca pengeluaran | Buat/revisi pengeluaran | Baca master | Kelola master/aturan | Approval |
| --- | --- | --- | --- | --- | --- |
| Superadmin / admin modul | Ya | Ya | Ya | Ya | Hanya penugasan sendiri |
| finance_admin | Ya | Ya | Ya | Ya | Hanya penugasan sendiri |
| operator | Ya | Ya | Tidak (opsi input minimal tersedia) | Tidak | Tidak |
| treasurer | Ya | Tidak | Ya | Tidak | Hanya penugasan sendiri |
| approver | Ya | Tidak | Tidak | Tidak | Hanya penugasan sendiri |

Akses baca seluruh pengeluaran mengikuti web lama; bukan hanya pembuat.
Akun/peran tetap dibuat di Core. Kandidat approver hanya anggota Keuangan aktif
berperan admin/finance_admin/treasurer/approver; endpoint hanya memberi id/nama.
Tidak mengimpor gabungan role/permission lama atau menaikkan hak lintas modul.

### Alur

1. Pengelola menambah sumber dana/kategori, lalu aturan rentang nominal dan approver.
2. Pengeluaran menyimpan rupiah bulat sebagai nilai tepat, tanpa float. Respons
   nominal berupa string; penulisan baru dibatasi Rp9.000.000.000.000.000.
3. Pemilihan aturan memakai batas inklusif; interval bertumpuk ditolak, termasuk
   rentang di dalam rentang lain dan batas yang bersinggungan. Approver/snapshot
   diambil atomik. Akun approver tidak aktif menggagalkan penyimpanan, tidak dilewati.
4. Tanpa aturan cocok: tercatat **Tanpa penugasan**, bukan Disetujui. Setelah aturan
   siap, revisi pengeluaran membentuk penugasan baru. Tidak ada approval otomatis.
5. Approver bekerja paralel pada penugasan sendiri. Penolakan memerlukan catatan
   minimal 10 karakter dan menutup tugas lainnya yang masih menunggu. Tugas yang
   telah dijawab tidak dapat direvisi selama ada penolakan approver lain.
6. Keputusan dapat direvisi oleh pemiliknya dengan alasan minimal 10 karakter.
   Revisi penolakan menjadi persetujuan membuka kembali tugas yang ditutup karena
   penolakan, selama tidak ada penolakan lain. Riwayat keputusan tidak ditimpa.
7. Perubahan pengeluaran selalu menjadi revisi baru, memerlukan versi dan alasan.
   Semua tugas revisi lama ditutup, keputusan/snapshot dipertahankan, dan approval
   baru dibentuk dari aturan saat itu. Tugas lama tidak bisa dipakai menyetujui
   revisi baru. Pembuat/origin historis tidak diganti saat revisi.
8. Status Disetujui hanya saat seluruh penugasan revisi aktif setuju. Tidak ada
   pembayaran, perubahan saldo, posting Core, hubungan Bantuan atau iPaymu.

Semua mutasi memakai requestId UUID per akun, fingerprint operasi+payload dan
transaksi DB; retry identik mengembalikan hasil pertama, reuse berbeda 409. Konflik
versi 409 meminta pengguna memuat ulang. Kunci tidak kedaluwarsa otomatis dalam
fase ini. Semua mutasi diserialisasi melalui lock row modul, lalu row dokumen;
identitas dan akses diperiksa ulang sebelum menulis. Audit service hanya insert;
tidak ada endpoint pengubahan/penghapusan event. DTO eksplisit, no-store/private.

### Schema dan batas tahap ini

Migration `2026_11_17_000004_add_keuangan_workflow` menambahkan revisi pengeluaran,
revisi/penutupan approval, audit pengeluaran dan deduplikasi permintaan. Unique
approval menjadi expense+revision+assigned_user. Indeks penyangga FK dibuat sebelum
unique lama diganti agar sesuai MySQL. Data historis tidak diimpor/ditulis ulang.
Down hanya bisa dipakai jika tambahan workflow belum berisi data; setelah digunakan,
rollback aplikasi mempertahankan schema dan audit. Jangan menghapus revisi untuk
memaksa rollback schema.

Tahap ini belum menyediakan penghapusan/arsip pengeluaran, pengeditan label master,
impor web lama, ekspor XLSX/PDF, atau lampiran bukti. Sumber/kategori dapat ditambah;
aturan dapat diubah/dinonaktifkan tanpa mengubah snapshot penugasan lama.


### Verifikasi workflow lokal

- KeuanganFoundationTest, KeuanganWorkflowTest dan AdminHierarchyTest: 37 tes,
  348 assertion lulus dengan SQLite dalam memori.
- Enam tes frontend mencakup payload nominal tepat, idempotency key, revisi,
  kegagalan API, beberapa approver, dan pembatasan formulir berdasarkan akses.
- Typecheck, ESLint frontend, Pint PHP, serta sinkronisasi OpenAPI lulus.
- Build produksi `npx next build --webpack` lulus (193 halaman).
- Belum ada migration atau aktivasi pada database utama, impor backup, push GitHub,
  atau perubahan pada VPS/web keuangan lama dalam tahap ini.
