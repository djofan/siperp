# Tanwir Qurani — data demo & pengujian lokal

## Data demo (hanya database lokal)

```bash
npm run db:seed:tanwir-demo            # buat 1 guru, 2 peserta, 1 kelompok, 3 tugas contoh
npm run db:seed:tanwir-demo -- --clean # hapus semua data demo
```

Semua data demo berawalan **[Demo]**. Script menolak berjalan bila `DATABASE_URL` bukan host lokal
atau `NODE_ENV=production`. Menjalankan ulang tidak membuat data ganda — script hanya menampilkan
kode akun yang sudah ada.

- Kode akun dicetak di terminal (format `GTQ…` untuk guru, `PTQ…` untuk peserta).
- Password semua akun demo: **`demo-tanwir-2026`** — bisa diganti lewat env `TANWIR_DEMO_PASSWORD`
  sebelum menjalankan seed. Ini kredensial uji lokal, jangan dipakai di server sungguhan.
- Masuk di `/tanwir/masuk`. Modul Tanwir yang masih **nonaktif** hanya bisa dibuka superadmin; aktifkan
  dulu di `/admin/super/modul` agar akun demo bisa login.

> Tip: login guru/peserta mengganti sesi di browser. Untuk tetap login sebagai superadmin di
> `http://localhost:3000`, buka akun demo di `http://127.0.0.1:3000` (cookie terpisah per host).

## Uji otomatis

```bash
npm run test:tanwir
```

Menjalankan unit test aturan murni (`tests/tanwir-policy.test.ts`) dan uji alur penuh ke MySQL lokal
(`tests/tanwir-flow.db-test.ts`): tugas otomatis ke kelompok PIC, validasi file dari isinya, setoran →
tolak (alasan wajib) → kirim ulang (percobaan 2) → setujui, kuis bernilai otomatis tanpa membocorkan
kunci, tenggat terkunci & perpanjangan oleh pembuat, penanda terlambat, lingkup data guru, dan hak akses
file setoran. Data uji dibuat dengan penanda unik dan dihapus lagi di akhir.
