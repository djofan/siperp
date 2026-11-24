# Modul Rapat

Modul Rapat berfokus pada rekaman audio dan transkripsi. Pengguna merekam atau
mengunggah audio, memeriksa dan mengoreksi hasil, menyimpan, menyalin, atau
mengunduh satu teks transkrip penuh. Pemutar menggunakan bar audio, termasuk WEBM.

## Alur utama

1. Buat rapat. Semua informasi dan peserta opsional. Judul serta tanggal otomatis
   diisi jika kosong; pengguna dapat melengkapinya kemudian. Baris peserta kosong
   diabaikan. Tanggal otomatis memakai Asia/Jakarta.
2. Rekam langsung atau unggah berkas. Simpan audio sebelum memulai transkripsi.
3. Whisper small int8 memproses maksimal 15 menit per job. Checkpoint terenkripsi
   memungkinkan kelanjutan otomatis jika proses terputus; hasil digabung berurutan.
4. Periksa nama, angka, dan tanggal. Koreksi dan simpan teks; salin atau unduh TXT.
   Regenerasi memerlukan konfirmasi karena mengganti koreksi manual.
5. Arsipkan rapat jika diperlukan. Rekaman dan transkrip tetap disimpan.

## Fitur yang dihentikan

Menu Pengaturan dan Tindak lanjut serta panel Notulen, Tindak lanjut, Dokumen,
dan Riwayat dihapus. Penyusunan/finalisasi notulen dan ekspor notulen tidak
tersedia. Tautan browser lama diarahkan ke daftar/detail transkrip. Endpoint lama
mengembalikan HTTP 410 setelah pemeriksaan akses modul; permintaan minutes pada
create/update juga ditolak. Job lama tidak boleh memanggil penyusun notulen.
Tidak memerlukan Ollama; readiness hanya memeriksa Whisper.

Data notulen, tugas, lampiran, pengaturan, dan audit lama tetap tersimpan privat.
Tidak ada migration, penghapusan tabel, file, atau perubahan kunci enkripsi.
Finalisasi lama tidak lagi mengunci transkrip/informasi; arsip, proses berjalan,
otorisasi penulis, dan optimistic locking tetap berlaku.

## Akses

Core dan Sanctum mengelola sesi. Admin/Superadmin mengelola seluruh rapat;
Sekretaris mengelola rapat miliknya; Pembaca dapat membaca. Audio disimpan privat
dan terenkripsi; izin upload tetap memungkinkan worker membaca ciphertext.
Riwayat internal untuk audit tetap direkam, tanpa panel atau endpoint riwayat.

## Verifikasi dan deployment

Tes API memakai SQLite dalam memori. Periksa metadata opsional, endpoint pensiun,
preservasi data lama, hak akses, upload, antrean bertahap, retry dan koreksi teks.
Periksa tampilan desktop/mobile serta tidak ada permintaan ke fitur pensiun.
Update rilis dan restart worker sesuai release manager; tidak perlu migration.
Lihat [panduan runtime lokal](rapat-local-ai.md).
