# PRD — Modul Ojol Mengaji

> Status: **sudah dibangun & diuji** (7 Oktober 2026) — lihat `docs/ojol-demo.md` untuk data demo & pengujian.
> Disusun dari pembedahan kode aplikasi lama `djofan/ojol-mengaji` (Laravel 12 + Filament).
> Aplikasi lama ini adalah "saudara" Tanwir Qurani (± 85% kodenya sama), jadi PRD ini **hanya mencatat
> perbedaannya**. Semua hal yang tidak disebut di sini mengikuti `docs/prd-tanwir.md`.

## 1. Ringkasan

Program pembinaan hafalan Qur'an LAZ SIP (Bogor) untuk **driver ojek online**. Setoran suara/video dan
kuis bisa dikirim kapan saja ada jeda di antara order; guru/musyrif pembimbing meninjau dari mana saja.
Pesan utama situs: *"Istirahat narik, lanjut setoran."*

## 2. Peran

| Peran | Siapa | Tempat kerja |
|---|---|---|
| Admin Ojol | Pengelola program | `/admin/ojol` |
| Guru | Guru/musyrif pembimbing | `/ojol/guru` |
| Peserta | Driver ojek online | `/ojol/peserta` |

Autentikasi sama persis dengan Tanwir (akun Core + `OjolMember`, login kode akun di `/ojol/masuk`),
dengan awalan kode **`GOM001`** (guru), **`POM001`** (peserta), **`OM001`** (kelompok).
Email placeholder: `<kode>@ojol.invalid`.

## 3. Perbedaan dari Tanwir Qurani

| Hal | Tanwir Qurani | **Ojol Mengaji** |
|---|---|---|
| Kelompok | Punya PIC guru wajib | **Tanpa PIC** (hanya kode, nama, deskripsi) |
| Penerima tugas | Otomatis kelompok yang di-PIC-i guru | **Guru memilih kelompok** penerima saat membuat/mengubah tugas |
| Peninjau setoran | Hanya guru pembuat | Guru pembuat **+ guru lain yang ditunjuk sebagai co-reviewer** (`approvers`) |
| Antrean koreksi guru | Tugas buatannya | Tugas buatannya **atau** yang menunjuk dirinya sebagai co-reviewer |
| Perpanjang tenggat, ubah, hapus tugas | Guru pembuat | Guru pembuat (co-reviewer tidak bisa) |
| Anak didik | Ada | **Tidak ada** |
| Tempat mengajar di profil | Nama TPQ | Tidak ditampilkan (peserta adalah driver) |
| Situs publik | Beranda, Tentang, Program, FAQ, Kontak | Beranda, Tentang, **Cara Bergabung** (4 langkah), FAQ |

Konsekuensi aturan bisnis: aturan Tanwir §6 nomor 1, 7, dan 12 diganti menjadi:
1. Tugas dikirim ke **kelompok yang dipilih guru** (minimal satu).
7. Koreksi oleh **guru pembuat atau co-reviewer** tugas tersebut; log mencatat siapa peninjaunya.
12. Guru melihat tugas yang ia buat atau yang ia tinjau; tidak ada lingkup "kelompok diampu".

## 4. Arah Desain

Sama prinsipnya dengan Tanwir (elegan, bersih, minimalis), dengan identitas sendiri yang lebih
energik namun tetap tenang: latar putih hangat, tinta gelap, aksen hijau segar yang terkait dunia
ojek online — dipakai hemat. Bahasa santai sesuai sasaran ("narik", "setoran", "jeda order") tetap
dipertahankan dari situs lama.

## 5. Skema Data (`modules/ojol/schema.prisma`)

Sama dengan Tanwir dengan prefix `Ojol` (`OjolMember`, `OjolGroup`, `OjolTask`, `OjolTaskGroup`,
`OjolQuizQuestion`, `OjolSubmission`, `OjolSubmissionLog`, `OjolQuizAnswer`), ditambah:
- `OjolTaskApprover` (`ojol_task_approvers`) — pivot tugas ↔ guru co-reviewer, unik (tugas, guru).
- Tanpa `picId` di kelompok, tanpa tabel anak didik.

Modul Ojol **tidak** memakai tabel Tanwir (dan sebaliknya), walaupun strukturnya mirip (CLAUDE.md §3).

## 6. Definition of Done

Status 7 Oktober 2026: semua butir terpenuhi (`npm run test:ojol` + uji manual di browser). Tersisa: uji perekaman langsung di
HP sungguhan. Data aplikasi lama tidak dimigrasi — mulai dari nol (keputusan 7 Oktober 2026).


Seluruh DoD Tanwir yang relevan, ditambah:
- [x] Guru memilih kelompok penerima & co-reviewer saat membuat tugas.
- [x] Co-reviewer melihat setoran tugas itu di antreannya dan bisa menyetujui/menolak; tidak bisa
      mengubah, menghapus, atau memperpanjang tugas.
- [x] Halaman Cara Bergabung tampil di situs publik.
