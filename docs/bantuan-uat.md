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


## Pencairan sekaligus

Buka **Pencairan & penyaluran → Siap dicairkan** sebagai Bendahara atau admin.
Centang kartu/baris atau **Pilih semua di halaman ini**, lalu klik **Tandai sudah dicairkan**.
Pilihan dibatasi pada pengajuan `fund_approved` di halaman hasil filter yang sedang terlihat.
Perubahan halaman/filter mengosongkan pilihan; maksimal 48 pengajuan per halaman.

Tanggal transfer cukup diisi sekali. Nama penyalur dan hubungan/peran diisikan sebagai awal,
tetapi Bendahara tetap memeriksa dan dapat mengoreksinya. Isi bank dan nomor rekening sesuai
transfer. Jika bank sama, gunakan **Bank semua transfer sama? Isi sekali**. Untuk penyalur yang
sama, tombol salin menerapkan data penerima/rekening ke pengajuan terpilih dengan penyalur
tersebut; bukti transfer tidak disalin otomatis. Nominal mengikuti persetujuan dan tidak dapat
diubah dari form ini.

Bukti transfer opsional untuk pengajuan perorangan, wajib untuk **Pengajuan lainnya**.
Sesudah memeriksa ringkasan, centang konfirmasi dan klik **Simpan pencairan**. Ini mencatat
transfer yang sudah dilakukan, bukan mengirim uang. Status menjadi `disbursed` dan penyalur
menerima notifikasi sesuai alur yang berlaku; laporan penyerahan tetap tahap terpisah.

Server memeriksa hak akses, nominal, status dan versi setiap pengajuan dalam satu transaksi.
Jika salah satu gagal, tidak ada status pencairan yang disimpan. Bukti yang sudah diunggah
sebelumnya tetap tersimpan pada dokumen pengajuan dan dapat digunakan saat mencoba ulang.
Data bank, rekening, penerima dan tanggal disimpan privat serta dicatat pada riwayat pencairan.
