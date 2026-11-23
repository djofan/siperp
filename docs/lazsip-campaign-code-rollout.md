# Rollout kode unik campaign LAZSIP

## Tahap kode saat ini: penulisan opsional

Admin dapat mengosongkan kode unik; kode yang diisi tetap dua digit unik.
Kode terkonfigurasi selalu diterapkan oleh server pada pembayaran. Tanpa kode,
nominal donasi tidak berubah. Omisi update mempertahankan kode, null/kosong
menghapusnya. Perubahan ini tidak mengubah transaksi lama atau mengisi kode buatan.

## Syarat sebelum mengaktifkan rilis ini di VPS

Rilis pembayaran lama menolak kode null/kosong. Karena itu pasang pembaca yang
mendukung kode kosong pada seluruh backend yang melayani request, worker, dan
semua target rollback sebelum mengaktifkan formulir/API penulisan opsional ini.
Periksa active/previous, routing versi, retained serta legacy. Satu merge atau
update belum membuktikan semua pembaca kompatibel. Jangan mematikan rilis aktif
atau previous secara paksa untuk melewati syarat ini.

Migration `2026_11_23_000001_make_lazsip_campaign_unique_code_optional` harus sudah
berjalan dan file migration tidak diubah. Hash file tetap
`9a44a2702a6d11687610727574d4081f84186362606d8e8a62ee7f450cbcc35d`.
Backup dan review migration mengikuti release manager. Jangan mengubah registry
rilis atau schema secara manual untuk melewati review deployment.

Setelah campaign tanpa kode dibuat, rollback hanya boleh menuju rilis yang juga
mendukung kode kosong. Jangan melanjutkan kandidat lama dengan token deployment
lama; siapkan kandidat baru dan review hasilnya. Perubahan lokal/merge PR tidak
berarti syarat VPS sudah diperiksa atau deployment telah dijalankan.
