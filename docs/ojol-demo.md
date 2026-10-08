# Ojol Mengaji — data demo & pengujian lokal

## Data demo (hanya database lokal)

```bash
npm run db:seed:ojol-demo            # 2 guru (1 co-reviewer), 2 peserta, 2 kelompok, 2 tugas contoh
npm run db:seed:ojol-demo -- --clean # hapus semua data demo
```

Semua data demo berawalan **[Demo]**. Script menolak berjalan bila `DATABASE_URL` bukan host lokal atau
`NODE_ENV=production`, dan tidak membuat data ganda bila dijalankan ulang.

- Kode akun dicetak di terminal (`GOM…` guru, `POM…` peserta).
- Password semua akun demo: **`demo-ojol-2026`** (ubah lewat env `OJOL_DEMO_PASSWORD`). Kredensial uji lokal —
  jangan dipakai di server sungguhan.
- Masuk di `/ojol/masuk`. Modul Ojol yang masih **nonaktif** hanya bisa dibuka superadmin; aktifkan dulu di
  `/admin/super/modul` agar akun demo bisa login.
- Tugas "Setoran An-Naba" menunjuk guru kedua sebagai **co-reviewer** — masuk sebagai guru itu untuk melihat
  setoran di antreannya tanpa bisa mengubah/menghapus tugas.

> Tip: buka akun demo di `http://127.0.0.1:3000` supaya sesi superadmin di `http://localhost:3000` tidak tertimpa.

## Uji otomatis

```bash
npm run test:ojol
```

Unit test aturan murni (`tests/ojol-policy.test.ts`) dan uji alur penuh ke MySQL lokal
(`tests/ojol-flow.db-test.ts`): kelompok penerima wajib dipilih & hanya peserta kelompok itu yang menerima tugas,
co-reviewer bisa mengoreksi tetapi tidak mengubah/menghapus/memperpanjang tugas, guru lain tidak punya akses,
setoran → tolak → kirim ulang → setujui (log mencatat peninjau), kuis bernilai otomatis, tenggat & penanda
terlambat, serta hak akses file setoran. Data uji dihapus lagi di akhir.
