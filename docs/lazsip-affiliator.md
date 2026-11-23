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

## Pemisahan PR

Fitur ini dipisahkan dari PR #161 (`feature/academy`) ke branch baru dari `main`.
Hanya perubahan Affiliator LAZSIP yang diambil. Tidak menyertakan perubahan kode,
kontrak, tes, atau migration Academy. Penyesuaian pengujian email LAZSIP yang tidak
berhubungan dengan fitur ini juga tidak diambil. Kontrak OpenAPI dibuat ulang dari
generator `main` terbaru; endpoint lama dipertahankan tanpa perubahan.

Terdapat dua migration: `2026_11_20_000000_create_lazsip_affiliates` membuat profil
yang terhubung ke akun Core, dan `2026_11_20_010000_add_lazsip_affiliate_referral_codes`
menambahkan kode referral acak unik serta mengisi kode yang belum tersedia.
Login email khusus affiliator; login ERP di luar panel ini tetap mengikuti Core.
Kode referral diverifikasi sebelum pengalihan, tanpa pencatatan komisi atau payout.

## Verifikasi

Pengujian backend menggunakan SQLite dalam memori, tanpa menyentuh database lokal,
VPS, atau web lama. Pengujian mencakup registrasi, login email, kepemilikan profil,
pembatasan akses admin, kode referral, status akun, dan pembatasan percobaan login.
Tes frontend memeriksa kontrak serta pengalihan referral satu origin.
Commit/push dan merge tidak berarti sudah diterapkan ke VPS. Review migration dan
backup tetap diperlukan sebelum penerapan lewat release manager.
