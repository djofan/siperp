# Pengujian UAT Bantuan lokal

`BantuanUatSeeder` membuat empat akun baru (`UATADMIN01`, `UATREQ001`, `UATVER001`,
`UATTRES01`), lima pengajuan `BNT-UAT-001` sampai `005`, bukti gambar sintetis,
notifikasi belum dibaca serta audit berlabel simulasi. Peran admin bukan superadmin.
Tidak membuat approver tambahan atau mengubah akun/data demo yang sudah ada.

Seeder hanya berjalan pada APP_ENV=local dan database MySQL `sipmodular_laravel_dev`.
Set `BANTUAN_UAT_PASSWORD` melalui environment proses (minimal 12 karakter), lalu
jalankan `php artisan db:seed --class=Database\\Seeders\\BantuanUatSeeder` dari `api`.
Hapus environment proses setelah selesai. Jangan commit password, token atau file akses.
Jika kode akun atau nomor pengajuan UAT sudah ada, seeder menolak seluruh operasi
agar pengujian yang sedang berjalan tidak direset.

Draft berisi nama panjang dan karakter khusus untuk pemeriksaan tampilan. Ada tugas
survei, pendanaan disetujui, pencairan dan penyaluran selesai untuk pemeriksaan detail,
laporan serta notifikasi. Semua identitas/kontak fiktif; tidak ada transfer uang nyata.
Jangan jalankan seeder ini di server publik.
