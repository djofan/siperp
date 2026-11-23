# Rollout kode unik campaign LAZSIP

## Tahap saat ini: perluas pembaca, pertahankan penulisan lama

Migration `2026_11_23_000001_make_lazsip_campaign_unique_code_optional` hanya
membuat kolom nullable; tidak mengosongkan nilai lama dan tetap mempertahankan
indeks unik. Hash file yang sudah tercatat pada kandidat VPS tidak boleh diubah:
`9a44a2702a6d11687610727574d4081f84186362606d8e8a62ee7f450cbcc35d`.

Schema nullable saja tidak cukup untuk menyatakan fitur kode opsional kompatibel.
Rilis pembayaran lama menolak kode null/kosong dengan 503. Perbaikan tahap ini
mempertahankan pembacaan null yang toleran pada kode baru, tetapi API create/update
dan formulir admin tetap mewajibkan dua digit unik. Request hilang/null/kosong
ditolak sebelum menulis, bukan diganti kode buatan atau nominal donasi berbeda.
Target nominal campaign tetap opsional. Transaksi dan kode lama tidak diubah.

Dengan demikian, bila semua campaign sebelum deployment memiliki kode yang valid,
penulisan melalui API lama maupun baru tidak memperkenalkan nilai yang tidak dapat
dibaca versi pembayaran lama. Rilis sebelumnya tetap dapat menjadi target rollback.

## Pemeriksaan sebelum deployment

Di sesi database privat VPS, lakukan query baca-saja ini sebelum menyetujui migration:

```sql
SELECT COUNT(*) AS invalid_campaign_codes
FROM lazsip_campaigns
WHERE unique_code IS NULL OR unique_code NOT REGEXP '^[0-9]{2}$';
```

Hasil harus nol. Bila bukan nol, hentikan rollout campuran dan periksa datanya;
jangan mengisi kode otomatis, mengganti nominal, atau meneruskan flag kompatibilitas.
Query ini bukan pemeriksaan beban/metadata lock. ALTER TABLE tetap bisa menunggu
lock dan perlu ditinjau terhadap ukuran tabel serta aktivitas database saat itu.

Kandidat tertunda `20261123041201-5cec1ceb1040` berisi penulisan opsional yang belum
dibatasi. Jangan melanjutkan kandidat itu dengan token lamanya. Setelah perbaikan
ini direview, di-merge dan tersedia di main, jalankan update rutin untuk menyiapkan
kandidat baru. Review ID/token/seluruh migration yang dicetak kandidat baru.
Backup tetap dibuat oleh release manager sebelum migrate. Jangan mengubah file
migration, registry rilis atau schema secara manual untuk melewati review.

Perubahan ini tidak memasang Whisper, tidak mengubah konfigurasi Python server,
dan tidak menghilangkan kebutuhan mengunduh checkpoint small saat deployment Rapat.

## Tahap berikutnya: izinkan penulisan tanpa kode

Aktifkan melalui perubahan terpisah hanya sesudah seluruh backend yang masih
melayani request, worker dan target rollback memakai pembaca toleran kode kosong.
Periksa active/previous, routing versi, rilis retained serta legacy yang masih
melayani request; merge atau satu kali update saja belum membuktikan syarat ini.
Jangan mematikan rilis aktif/previous secara paksa untuk melewati syarat tersebut.

Pada tahap itu, API, formulir, kontrak dan tes penulisan opsional diubah bersama.
Setelah campaign tanpa kode dibuat, rollback ke pembaca lama yang menolak null
tidak lagi aman. Tidak perlu menjalankan ulang atau mengubah migration di atas.
