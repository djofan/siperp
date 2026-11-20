# Akun affiliator LAZSIP

Tahap ini menyediakan pendaftaran terbuka, login, logout, dashboard pribadi, dan perubahan profil. Tombol **Jadi Affiliator** di footer mengarah ke `/lazsip/affiliator/daftar`.

## Alur pengguna

1. Pengguna baru mengisi nama, email, nomor telepon 8–15 angka (opsional awalan +), password minimal 12 karakter dan konfirmasi.
2. Akun Core dan keanggotaan affiliator langsung aktif tanpa persetujuan admin. Cookie sesi HttpOnly dipasang; pengguna langsung masuk ke panel.
3. Login affiliator menggunakan email dan password. Kode internal Core tidak ditampilkan pada panel atau respons profil affiliator. Password tidak muncul kembali dan tidak disimpan di browser storage.
4. Akun ERP yang sudah ada cukup masuk menggunakan email/password pada `/lazsip/affiliator/masuk`. Keanggotaan otomatis dibuat satu kali; akun duplikat tidak dibuat berdasarkan email.
5. `/lazsip/affiliator/profil` mengubah nama, email dan telepon milik sendiri. Nama/email dipakai bersama akun ERP. Logout mencabut token aktif melalui endpoint Core.

## Batas akses

Profil disimpan di `lazsip_affiliates` dengan user_id unik dan foreign key Core. Login email hanya berlaku pada endpoint affiliator; login ERP lain tetap menggunakan kode akun. Tidak ada tabel password baru dan tidak ada role/module_access LAZSIP yang diberikan melalui pendaftaran publik. Endpoint operasional/admin tetap tertutup untuk akun affiliator baru. Backend selalu memilih profil melalui user terautentikasi; ID dari query/body tidak menentukan kepemilikan. Keanggotaan nonaktif tetap ditolak walaupun password benar. Login biasa Core tidak mengaktifkan keanggotaan.

Link referral acak unik tersedia pada panel, dengan tombol salin dan buka link. Kode dibuat dari 10 byte acak kriptografis (20 karakter hex), disimpan permanen per affiliator dengan indeks unik, dan tidak berubah ketika profil diperbarui. Link `/lazsip/r/{code}` memeriksa status aktif pemilik lalu mengarahkan ke halaman zakat dengan parameter ref.

Pencatatan klik/transaksi referral, perhitungan komisi, rekening dan withdraw **belum diimplementasikan**. Dashboard menyatakannya belum aktif, tanpa angka saldo/transaksi simulasi atau tombol transfer palsu. Tidak ada integrasi payout, tarif komisi atau pemotongan zakat pada perubahan ini.

## API

- POST `/api/v1/lazsip/affiliate/registrations`: 201 + Location dan cookie sip_session. Pembatasan 5/menit per IP.
- POST `/api/v1/lazsip/affiliate/sessions`: 200 + cookie, memakai limiter khusus email (5/menit per email yang dinormalisasi + IP).
- GET `/api/v1/lazsip/affiliate/me`: profil sendiri, tanpa mutasi.
- PUT `/api/v1/lazsip/affiliate/me`: name/email/phone lengkap; 10/menit.

Respons profil menggunakan Resource dengan whitelist; Cache-Control no-store, private. Error mengikuti ErrorResource 401/403/404/422/429. Token tidak dikirim di JSON. Origin cookie writes mengikuti middleware API yang sudah ada.

## Deployment

Jalankan migration tambahan `2026_11_20_000000_create_lazsip_affiliates` sesudah review/backup database melalui prosedur deployment proyek. Migration pertama membuat satu tabel baru, tanpa mengubah akun atau transaksi lama. Perbarui backend/frontend dan build/restart sesuai prosedur rilis. Tidak ada secret atau dependency baru. Kode lokal/commit tidak otomatis berarti server publik telah diperbarui.

## Verifikasi lokal

- Migration tabel affiliator berhasil diterapkan hanya pada `sipmodular_laravel_dev` setelah MySQL Laragon dijalankan.
- 70 tes backend LAZSIP dan login Core lulus (437 assertion), termasuk 17 tes affiliator. Database tes SQLite in-memory.
- Tiga tes kontrak OpenAPI lulus; artifact generator tidak drift; ESLint file frontend yang berubah dan Next route type generation lulus.
- Assertion lama tes email LAZSIP disesuaikan dengan tambahan kode diagnosis/request ID ErrorResource yang sudah berlaku, tanpa mengubah perilaku email.
- Browser lokal: tombol footer, registrasi langsung masuk panel, simpan profil, logout, penolakan password salah, login ulang, dan redirect tamu dari panel privat berhasil. Tampilan desktop dan HP diperiksa; halaman tidak melebar secara horizontal pada lebar tampilan 375 piksel.
- Typecheck global belum lulus karena dependency `exifr`, `firebase/app`, dan `firebase/messaging` pada modul Bantuan belum tersedia di instalasi lokal. Tidak ada error LAZSIP dalam hasil pemeriksaan tersebut. Build penuh belum dinyatakan lulus.
- Satu akun dummy bertanda `[Uji Lokal]` dibuat di database development melalui alur registrasi untuk pengujian browser. Tidak memakai data production atau mengirim pembayaran/email.

Perubahan masih lokal; belum commit, push, atau deployment ke server publik.

Login affiliator sudah diganti menjadi email/password; email dinormalisasi tanpa membedakan kapital/spasi luar. Login kode akun hanya berlaku di endpoint ERP lainnya. Setelah perubahan email profil, login berikutnya menggunakan email baru. Tidak memerlukan migration tambahan.

Migration tambahan `2026_11_20_010000_add_lazsip_affiliate_referral_codes` menambah kolom kode unik dan mengisi kode acak untuk affiliator yang sudah ada. GET tidak membuat/mengubah kode. API publik hanya mengembalikan kode yang diverifikasi, tanpa nama/email/telepon pemilik.

Link referral sudah diuji lewat browser lokal: tombol salin menampilkan konfirmasi dan tautan valid mengarah ke halaman zakat dengan kode ref yang sama. Tiga tes pengalihan link memverifikasi tujuan tetap satu origin, penolakan kode invalid/nonaktif, dan penanganan gangguan API. Migration kode referral sudah diterapkan pada database development lokal; semua affiliator lama sudah mendapat kode.
