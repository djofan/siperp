# SARSIP

Modul tim SAR Solidaritas Insan Peduli.

## Halaman

- `/sarsip`: profil tim, kegiatan, campaign, dan berita terbaru.
- `/sarsip/kegiatan`, `/sarsip/campaign`, `/sarsip/berita`: daftar publik.
- `/sarsip/[kind]/[id]`: detail; campaign memuat form donasi dan donatur lunas.
- `/admin/sarsip`: dashboard, profil, editor kegiatan/campaign/berita, transaksi, dan donatur.

Admin harus superadmin atau memiliki akses modul `sarsip` di manajemen akun Core.
`/admin/sarsip/beneficiary` mengelola penerima manfaat (tambah, edit, arsip). Identitas dan catatan hanya untuk admin.
Catat satu baris per orang dan perbarui bantuan berikutnya pada baris yang sama agar jumlah penerima tidak berulang.
Ringkasan `#transparansi` di beranda menghitung donasi SARSIP berstatus `paid` tanpa biaya admin,
donatur unik dari transaksi tersebut, dan penerima manfaat yang belum diarsipkan.
Terapkan juga migrasi `20260921120000_add_sarsip_beneficiaries` lalu generate Prisma client.
Kartu penerima manfaat berada sebelum kegiatan di beranda, dengan filter kategori dan tautan `/sarsip/penerima-manfaat`.
Terapkan migrasi `20260921150000_sarsip_public_beneficiaries` untuk nama tampilan publik, kategori, nominal, foto, dan status publikasi.
Data lama tetap privat secara default. Admin memilih nama tampilan/foto yang boleh dipublikasikan lalu mengaktifkan publikasi.
Query publik hanya mengambil nama tampilan, kategori, nominal, dan foto; nama internal, telepon, lokasi, dan catatan tidak dikirim ke publik.
Konten draft/arsip tidak tampil publik. Pengarsipan mempertahankan ID campaign dan riwayat pembayaran.
Program tidak lagi tersedia di navigasi, halaman, atau API konten SARSIP. Data program lama tetap tersimpan tetapi tidak ditampilkan.
Halaman detail menampilkan sidebar kegiatan, campaign, dan berita lain yang sudah dipublikasikan,
maksimal tiga per kategori tanpa menyertakan konten yang sedang dibaca. Pada layar kecil sidebar berada di bawah artikel.

Foto kegiatan, campaign, dan berita dipilih dari file (JPG/PNG/WebP, maksimal 2 MB),
dengan pratinjau dan pilihan menghapus gambar dari konten. Upload dilakukan ketika Simpan ditekan.
Endpoint `/api/sarsip/upload` memeriksa akses admin SARSIP, ukuran, MIME, dan signature file.
Penyimpanan lokal sementara di `public/uploads/sarsip` mengikuti SIP/LAZSIP; gunakan storage persisten sebelum deployment produksi.
Gambar lama tetap tersedia sampai diganti; menghapus gambar dari konten tidak menghapus berkas yang mungkin masih dipakai konten lain.

## Setup lokal

1. Terapkan migrasi `20260921090000_add_sarsip` sesuai alur migrasi proyek. Jangan reset database yang sudah berisi data.
2. Jalankan `npx prisma generate`, lalu restart server development bila masih memakai client lama.
3. Jalankan `npm run db:seed:sarsip` untuk mendaftarkan modul, profil awal, metode simulasi Rp0, dan rekening dummy jika belum ada.

Setup simulasi menolak lingkungan production. Seed utama hanya mendaftarkan modul/profil dan tidak mengaktifkan metode simulasi.
Isi konten nyata melalui admin; tidak ada contoh kegiatan fiktif yang dipublikasikan otomatis.

## Alur donasi

Form SARSIP mengirim ke `/api/payment/checkout` dengan `moduleSource: sarsip`, `sourceType: campaign`, dan `fundType: donasi`.
Server memvalidasi campaign terpublikasi, nominal, identitas, dan metode milik SARSIP serta menghitung biaya admin.
Identitas memakai `PaymentDonor` bersama (nomor WhatsApp dinormalisasi); transaksi hanya merujuk `donorId`.
Checkout berada di modul payment dan tautan kembali mengarah ke campaign SARSIP.

Admin SARSIP menandai lunas/gagal di Transaksi donasi. Total campaign dihitung langsung dari transaksi `paid` milik SARSIP,
tanpa biaya admin. Nama anonim disamarkan di server sebelum data publik dikirim. Nomor telepon hanya tampil di admin.
Admin modul lain tidak bisa mengonfirmasi transaksi SARSIP kecuali juga diberi akses SARSIP.

## Pengujian

Dengan database lokal dan server development aktif:

```sh
npm run test:sarsip
npm run test:donation
```

Tes SARSIP membuat data sementara dan membersihkannya kembali; meliputi akses, draft/publikasi, jenis konten,
validasi pembayaran, deduplikasi donatur, pemisahan rekening, privasi, konfirmasi berulang, dan arsip campaign.
