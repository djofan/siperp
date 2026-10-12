# Teknisi HP

Modul outlet servis HP dan monitoring, diadaptasi dari konsep tiket kerja, lokasi, aset, dan riwayat aktivitas [SiteTrackr / djofan/teknisi-hp](https://github.com/djofan/teknisi-hp). Implementasi ditulis untuk arsitektur SIP (Next.js, Core Auth, Prisma/MySQL); bukan menjalankan backend Fastify/PostgreSQL dari referensi.

## Menjalankan

1. Jalankan `npm run db:setup:teknisi` untuk menerapkan migrasi modul ini saja dan mendaftarkan modul. Skrip tidak membuat data pelanggan contoh atau mengubah password akun.
2. Restart dev server setelah Prisma Client diperbarui.
3. Buka `/admin/teknisi` menggunakan superadmin. Tambahkan outlet, akun teknisi, dan sparepart sebelum menerima servis.
4. Peran `admin` dan `manager` mengelola seluruh outlet; `technician` menerima dan mengerjakan tiket di outletnya sendiri; `monitoring` melihat seluruh outlet tanpa mengubah data.
5. Daftarkan akun dari menu Teknisi dengan nama, alamat, nomor HP, password awal, dan outlet. NIP otomatis PTH01, PTH02, dst. Satu outlet hanya memiliki satu teknisi aktif. Login `/teknisi/masuk` membuka `/teknisi/panel`, dengan tampilan website outlet sendiri. Tombol Edit mempertahankan NIP; password kosong mempertahankan password lama. Tombol Hapus mencabut akses akun sambil menjaga riwayat.

## Fitur

- `/teknisi`: halaman layanan dan outlet aktif.
- `/admin/teknisi/teknisi`: pendaftaran, edit, dan hapus akun teknisi. Route pendaftaran lama mengarahkan ke halaman ini.
- `/teknisi/masuk`: login NIP/password dengan ikon mata dan cakupan outlet.
- `/teknisi/panel`: dashboard operator, `/tiket`, `/tiket/baru`, `/tiket/[id]`, `/sparepart`, `/outlet`, `/profil`. Seluruh navigasi dan redirect setelah penerimaan servis tetap di website publik; akses data tetap memakai guard Core dan batas outlet. Route `/teknisi/peserta` tetap tersedia untuk profil pelanggan lama.
- `/teknisi/cek-status`: status pelanggan menggunakan token acak 192-bit, tanpa identitas, IMEI, keluhan, atau catatan internal.
- `/admin/teknisi`: jumlah tiket per status, target terlambat, beban teknisi, stok minimum, aktivitas; refresh otomatis 30 detik saat tab terlihat.
- `/admin/teknisi/tiket`: pencarian, filter status/outlet, pagination, penerimaan, detail, penugasan, estimasi dan biaya jasa, timeline pengerjaan.
- `/admin/teknisi/outlet`, `/admin/teknisi/teknisi`, `/admin/teknisi/sparepart`: outlet, penempatan teknisi, stok dan restock.
- `/api/teknisi/ekspor`: CSV hingga 10.000 tiket sesuai cakupan akses, tanpa identitas pelanggan dan kode pelacakan.
- Penggunaan sparepart mengurangi stok secara atomik, menyimpan harga saat digunakan, serta mencatat aktivitas dan pergerakan stok.

Persetujuan pelanggan dicatat staf dalam catatan pengerjaan. Total biaya merupakan biaya jasa final ditambah sparepart; modul belum mencatat pembayaran atau terhubung payment gateway. Semua tanggal ditampilkan dalam WIB.

Jalankan `npx prisma migrate deploy` dan `npx prisma generate`, lalu restart server setelah pembaruan schema peserta. Uji akun peserta dengan `npm run test:participants` pada database lokal.

## Verifikasi

`npm run test:teknisi`, `npm run test:teknisi:integration`, `npx prisma validate`, `npx next typegen`, `npx tsc --noEmit`, dan ESLint pada berkas yang diubah. Uji halaman dengan dev server port 3100 melalui `node scripts/check-teknisi-pages.mjs`; gunakan `TEKNISI_TEST_URL` untuk port lain. Seluruh data uji integrasi dibersihkan otomatis.

## Batas adaptasi

Lampiran foto/file, mode offline dan sinkronisasi, peta, template field kustom, impor massal, dan branding per perusahaan pada referensi belum diadaptasi. Modul menggunakan cakupan satu organisasi SIP dengan banyak outlet; akses admin/manajer berlaku lintas outlet.
