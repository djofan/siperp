# Data dummy konten

Jalankan `npm run db:seed:content` pada database lokal pengembangan. Script menambahkan 58 record berlabel **[CONTOH]**:

- SIP: 5 program bantuan, 6 berita (5 published/1 draft), 4 dokumentasi penyaluran, 4 laporan contoh.
- LAZSIP: 5 program, 6 berita (5 published/1 draft), 4 kegiatan, 4 campaign, 3 mitra, 4 penerima bantuan fiktif.
- SARSIP: 3 kegiatan, 3 campaign, 3 berita (2 published/1 draft), 4 penerima bantuan fiktif.

Ilustrasi SVG dan 4 dokumen laporan HTML disimpan di `public/demo-content`. Laporan merupakan contoh susunan dokumen, bukan laporan keuangan nyata. Angka target campaign hanya ilustrasi; saldo dan nominal bantuan diisi nol. Tidak ada transaksi pembayaran, donatur, rekening, akun, NIK, nomor kontak, atau peran yang ditambahkan/diubah.

ID stabil memakai prefix `demo-content-v1-`. Menjalankan ulang seed melewati record yang sudah ada, termasuk record dummy yang telah diedit lewat admin. Seluruh insert database dilakukan dalam satu transaksi. Data asli serta pengaturan CMS tidak ditimpa. Program informasi ditautkan ke campaign contoh LAZSIP.

Untuk menghapus record contoh:

```powershell
node scripts/seed-demo-content.mjs --clean
```

Pembersihan hanya menyasar ID yang dibuat script. Jika campaign/program contoh sudah memiliki transaksi, penyesuaian saldo, atau pendaftar, pembersihan ditolak untuk menjaga riwayat. File ilustrasi tetap tersedia. Jangan gunakan seed ini pada database produksi; script menolak host database nonlokal dan `NODE_ENV=production`.
