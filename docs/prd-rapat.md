# Modul Rapat

Modul Rapat mengutamakan pencatatan manual, keputusan, tindak lanjut, dan arsip.
Rekaman, transkrip, dan AI adalah fasilitas tambahan. Mencatat, memfinalkan,
mencari, serta mencetak rapat tidak memerlukan model AI tersedia.

## Alur utama

1. Buat draf dengan judul, tanggal, waktu, tempat, agenda, pimpinan, dan notulis.
   Pilih format dokumen dan kop instansi. Gunakan peserta bawaan bila diperlukan
   dan catat kehadiran setiap peserta.
2. Tulis ringkasan, pembahasan, dan keputusan. Tambahkan tugas, penanggung jawab,
   tenggat opsional, serta status pengerjaan. Kesalahan jaringan tidak boleh
   menghapus tulisan atau mengklaim perubahan telah tersimpan.
3. Tambahkan dokumen pendukung bila diperlukan. Dokumen terpisah dari audio;
   setiap file memiliki nama, ukuran, serta tindakan unduh dan hapus yang jelas.
4. Tinjau lalu finalkan catatan. Hasil pembahasan harus ada, dan tugas memiliki
   penanggung jawab. Catatan final dikunci; pembukaan kembali memerlukan alasan
   yang tercatat. Koreksi dapat disimpan lalu difinalkan kembali.
5. Pantau tugas lintas rapat berdasarkan penanggung jawab dan status, termasuk
   yang melewati tenggat. Status tugas dapat diperbarui sesudah notulen final.
6. Cetak A4, simpan PDF melalui dialog browser, atau unduh Word. Dokumen
   membedakan Draf/Final dan menjelaskan bagian yang belum dicatat. Arsipkan dan
   cari kembali saat diperlukan.

## Pemeriksaan dan riwayat

Daftar rapat menampilkan tanggal rapat, peserta, keputusan, serta kemajuan tugas.
Status catatan (Draf/Final) berbeda dari status AI. Pencarian mencakup judul,
agenda, dan isi catatan sesuai hak akses; tersedia filter tanggal dan arsip.

Riwayat mencatat pelaku, waktu, jenis koreksi, dan versi. Snapshot privat disimpan
terenkripsi. Konflik versi meminta pemuatan ulang tanpa menghapus isian lokal.
Finalisasi, pembukaan kembali, dan perubahan tugas merupakan tindakan eksplisit.
Mengunduh atau mencetak dokumen tidak mengubah status catatan.

## Akses dan penyimpanan

Core dan Sanctum mengelola sesi. Admin Rapat/Superadmin mengelola seluruh catatan;
Sekretaris mengelola rapat miliknya; Pembaca memiliki akses baca. Laravel memeriksa
akses pada setiap permintaan termasuk history, ekspor, dan file.

Audio dan dokumen pendukung disimpan privat dan terenkripsi pada storage Laravel
persisten. Path internal tidak dikirim ke browser. Upload dibatasi ukuran, jenis
isi, dan jumlah file. Catatan final, rapat yang sedang diproses, serta arsip tidak
menerima perubahan dokumen. Riwayat tidak memuat token atau kredensial.

## Fitur pendukung AI

Pengguna dapat merekam, mengunggah audio, atau mengoreksi transkrip. Penyusunan
notulen otomatis hanya berjalan setelah dipilih. AI tidak menggantikan tinjauan
manusia dan tidak menjadi syarat menyelesaikan rapat. Lihat
[panduan runtime lokal](rapat-local-ai.md).

## Deployment

Review dan backup sebelum migration Rapat di production. Migration tambahan
menyimpan riwayat revisi dan dokumen; data lama serta storage tetap dipertahankan.
Atur batas upload PHP/Nginx agar cukup menampung multipart.

AI opsional memakai worker terpisah:

```sh
php artisan queue:work rapat --queue=rapat --tries=1 --timeout=3600
```

Ollama hanya mendengarkan loopback. Path Python, model, dan izin storage harus
sesuai server target. Merge Git tidak otomatis menerapkan perubahan di VPS.
Verifikasi alur manual tanpa AI, akses Pembaca, finalisasi, pembukaan kembali,
pencarian, unduhan privat, dan hasil cetak sebelum deployment.
