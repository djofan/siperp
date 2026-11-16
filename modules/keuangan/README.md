# Fondasi Keuangan

Tahap lokal 16 November 2026. Halaman `/admin/keuangan` memakai sesi Core dan
GET `/api/v1/keuangan/overview`. Modul didaftarkan **nonaktif** oleh migration
`2026_11_16_000001_create_keuangan_foundation`; akun dan transaksi tidak dibuat.
Core Superadmin dapat preview modul nonaktif sesuai middleware Core. Akun lain
memerlukan modul aktif, akun aktif, dan role Keuangan yang dikenali.

## Yang tersedia

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

## Peran dan batas tahap

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
