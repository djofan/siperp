# Responsive UI — 9 Oktober 2026

Perubahan UI saja, tanpa perubahan API, schema, atau data:

- Guard ukuran konten/grid/form bersama pada shell admin; tabel tetap dapat digeser di container sendiri.
- Dialog dibatasi viewport, kecuali drawer navigasi yang tetap setinggi layar.
- Target menu/sidebar dan tombol topbar minimal 44px pada perangkat touch.
- Filter dan footer tabel Tanwir/Ojol dapat membungkus pada layar kecil; teks panjang tidak mendorong layout.
- Login menyesuaikan layar 320px serta landscape pendek, tanpa menghilangkan field.
- Header landing Tanwir/Ojol dipadatkan di bawah 360px; overflow Tanwir 6px pada 320px teratasi.

QA browser menggunakan viewport 320×740, 390×844, 768×1024, 844×390 (landscape), 1024×768, dan 1440×900. Halaman perwakilan Core, LAZSIP, Ojol, Tanwir, SARSIP, SIP, Academy diuji; tidak ditemukan overflow horizontal pada document maupun main di ukuran pengujian. Halaman publik utama keenam modul, login Core/Tanwir/Ojol, dan form tambah peserta Tanwir/Ojol juga diperiksa pada 320px. Form tidak dikirim dan data tidak dimutasi.

Lint dan TypeScript lulus. Ini pengujian halaman perwakilan dalam browser, bukan jaminan semua halaman atau semua perangkat fisik. Panel guru/peserta terautentikasi, checkout Payment dengan data transaksi, seluruh dialog terbuka, Safari/iOS, dan pengujian keyboard virtual masih memerlukan QA tersendiri.
