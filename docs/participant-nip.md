# Pendaftaran peserta dan login NIP

Admin Teknisi HP: `/admin/teknisi/teknisi`. Isi nama, alamat, nomor HP, password awal, dan outlet. Setiap outlet hanya memiliki satu teknisi aktif. NIP otomatis PTH01, PTH02, PTH03, dan seterusnya. Login di `/teknisi/masuk` membuka `/teknisi/panel`, dengan tiket, sparepart, informasi outlet, dan profil di bawah alamat website yang sama. Akun teknisi tidak menampilkan menu dashboard SIP dan diarahkan keluar dari alamat admin lama. Teknisi hanya dapat melihat dan menerima servis di outletnya sendiri. Pengelolaan akun tetap dilakukan oleh admin di `/admin/teknisi/teknisi`.

Admin Academy: `/admin/academy/pendaftaran`. Isi nama, gender, alamat, nomor HP, dan password awal. NIP otomatis PAZ001, PAZ002, PAZ003, dan seterusnya. Gender menentukan grup Ikhwan atau Akhwat; program belajar merupakan enrollment terpisah dan dapat dipilih saat pendaftaran. Login peserta: `/academy/masuk`. Email akun lama/pengajar tetap diterima untuk kompatibilitas.

Tombol Edit mengubah nama, alamat, HP, grup Academy atau penempatan outlet Teknisi. NIP tetap sama. Password baru opsional dan memakai ikon mata; isian kosong mempertahankan password lama. Tombol Hapus menyembunyikan akun dan mencabut login modul, sambil mempertahankan riwayat belajar/servis. Nomor HP dapat digunakan kembali setelah penghapusan. Nomor NIP yang dihapus tidak digunakan ulang. Penomoran memakai counter database dalam transaksi sehingga pendaftaran bersamaan tidak menghasilkan nomor ganda.

Password di-hash dengan bcrypt melalui akun Core. Peserta Academy tidak memperoleh akses admin; teknisi memperoleh peran `technician` yang dibatasi ke outletnya. NIP Academy memakai kolom `nis`; migrasi menyesuaikan format NIP lama tanpa mengganti password. Alamat lama dibiarkan kosong sampai diperbarui. Tidak ada password yang disimpan di profil atau ditampilkan di daftar akun.

Setelah pull: `npm install`, `npx prisma migrate deploy`, `npx prisma generate`, restart `npm run dev`. Database lokal dapat diuji memakai `npm run test:participants`. Uji browser menggunakan akun sementara pada database lokal, lalu hapus fixture-nya.
