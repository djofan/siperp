# PRD — Modul SIP (Portal Induk)

**Bagian dari:** Platform Modular SIP (lihat `PRD.md` untuk arsitektur & roadmap keseluruhan)
**Fase:** 2
**Stack modul ini:** Next.js (App Router), Prisma, MySQL — native, tanpa backend terpisah, mengikuti struktur `modules/sip/` (lihat `CLAUDE.md` §4)
**Status:** Draft berdasarkan hasil riset langsung ke `insanpeduli.org` (WordPress/Elementor, situs lama yang digantikan)

---

## 1. Ringkasan

SIP (Solidaritas Insan Peduli) adalah portal induk yayasan — company profile + CMS yang jadi pintu masuk publik, menautkan ke semua divisi (LAZSIP, SARSIP, Mahad Tahfidz/Pendidikan). Modul ini menggantikan `insanpeduli.org` (WordPress). **Tidak menangani donasi/transaksi apa pun** — tombol "Infaq Sekarang" di sini cuma tautan ke campaign LAZSIP yang sudah ada; logic uang tetap 100% di modul `lazsip`.

Yayasan berdiri di Cileungsi, Bogor, 15 Juni 2015. Nomor akta AHU-0020359.AH.01.04 (2022), izin LAZ nomor R/1835/BPR1-BHKL/KETUA/KD.02.05/IV/2024 (4 Juli 2024) — data ini diambil dari halaman "Tentang SIP" yang sudah live, dipakai sebagai seed konten awal (bukan dikarang), tetap bisa diedit admin lewat CMS.

## 2. Arah Desain

Diekstrak dari CSS asli `insanpeduli.org` (bukan tebakan) — palet beda dari LAZSIP tapi satu keluarga (SIP = induk, LAZSIP = salah satu divisi):
- Primary: hijau tua `#2C4039` (mirip keluarga warna LAZSIP tapi bukan sama persis — dipertahankan beda supaya modul SIP tetap terasa sebagai identitas tersendiri, bukan cuma re-skin LAZSIP)
- Secondary/accent hijau: `#479E6A`
- Aksen CTA: amber `#FFA301`
- Teks: `#191616` / `#5D5D5D`

Token warna baru diprefix `sip-*` di `app/globals.css` (aditif, konsisten dengan pola `lazsip-*` yang sudah ada — tidak menyentuh token modul lain). Layout admin reuse pola `AdminShellChrome` Core (sidebar + topbar + drawer mobile), gaya kartu/badge/tombol pil mengikuti konvensi yang sudah baku di platform.

## 3. Fitur Publik

### 3.1 Beranda
- Hero: headline, CTA ganda — "Infaq Sekarang" (link ke campaign LAZSIP aktif) dan "Pengajuan Bantuan" (link `wa.me`).
- Kegiatan Terkini: carousel/grid berita kegiatan terbaru.
- Program Bantuan SIP: carousel/grid 7 program (Kesehatan, Pendidikan, Kebutuhan Pokok, Anak Yatim, Anak Asuh, Lembaga Tahfidz, Air Bersih) — tiap kartu link ke halaman detail info + tombol infaq ke campaign LAZSIP terkait.
- Divisi: kartu LAZ SIP / SAR SIP / Mahad Tahfidz, masing-masing link ke modul terkait (LAZSIP sudah ada; SARSIP & Pendidikan tampil sebagai "segera hadir" sampai modulnya jadi).
- Mitra: logo-logo pendukung (reuse pola `MitraMarquee` LAZSIP sebagai referensi visual, komponen sendiri, tidak import dari modul lazsip).
- Footer: alamat, email, WhatsApp, sosial media, ringkasan legalitas.

### 3.2 Profil
- Tentang SIP: sejarah, visi-misi, legalitas (akta, izin LAZ) — konten CMS (key-value, pola sama seperti `LazsipSiteContent`).
- Struktur Pengurus: daftar nama + jabatan + foto (opsional), dikelompokkan per level (Pembina, Pengurus Inti, Pengawas, dst).
- Jangkauan Bantuan: statistik (jumlah verifikator, kota/kabupaten, provinsi) + daftar nama kota — konten CMS, bukan data terhitung otomatis.

### 3.3 Program Bantuan SIP
- List + detail per program (7 program di atas). Ini HALAMAN INFO saja (deskripsi, foto, syarat/cara ajukan bantuan) — bukan campaign donasi. Tombol "Infaq untuk program ini" tetap link keluar ke campaign LAZSIP yang sesuai (dipilih admin saat isi konten program, disimpan sebagai URL/ID campaign referensi).

### 3.4 Blog
- List (thumbnail, judul, tanggal, excerpt) + detail. Terpisah dari Berita LAZSIP (keputusan final: Blog SIP untuk konten lintas-yayasan/umum, Berita LAZSIP tetap untuk kegiatan spesifik LAZSIP — lihat §8).

### 3.5 Laporan
- Laporan Bulanan & Tahunan: daftar entri (judul/bulan/tahun) + tautan (URL eksternal seperti Google Drive, ATAU upload PDF sendiri — admin pilih salah satu per entri, mengikuti kebiasaan operasional yang sudah berjalan pakai Drive).

### 3.6 Kontak
- Alamat kantor, email, WhatsApp, sosial media (reuse pola halaman Kontak LAZSIP sebagai referensi, bukan share komponen).

## 4. Fitur Admin

CRUD penuh untuk semua entitas di atas: Konten Profil (Tentang, Jangkauan Bantuan — key-value form), Struktur Pengurus, Program Bantuan SIP, Blog, Laporan, Kegiatan Terkini, Mitra. Semua diproteksi lewat Core (`hasModuleAccess(session, "sip")`), tidak ada auth terpisah.

## 5. Skema Data (`modules/sip/schema.prisma`)

Semua model diprefix `Sip` (konvensi wajib, lihat `CLAUDE.md` §5):

```
SipSiteContent      id, sectionKey, contentJson   (pola sama seperti LazsipSiteContent — tentang, jangkauanBantuan, kontak, hero)
SipPengurus         id, name, position, level, photo, order, createdAt
SipProgramBantuan   id, title, slug, description, image, campaignUrl (link infaq ke LAZSIP), isPinned, createdAt
SipBlog             id, title, content, image, isPinned, status (draft/published), createdAt
SipLaporan          id, title, type (bulanan/tahunan), periodMonth, periodYear, fileUrl, createdAt
SipKegiatanTerkini  id, title, description, image, date, createdAt
SipMitra            id, name, logo, url
```

## 6. Aturan Penting

1. **Tidak ada logic uang di modul ini.** Semua tombol "Infaq"/"Donasi" adalah link keluar ke campaign LAZSIP (via URL), bukan form/transaksi baru.
2. **Tidak boleh import kode dari `modules/lazsip/`.** Kalau butuh pola visual serupa (marquee mitra, dsb), tulis ulang komponennya sendiri di `modules/sip/components/` — boleh terinspirasi, tidak boleh share kode lintas modul kecuali eksplisit didiskusikan (§3 `CLAUDE.md`).
3. Struktur folder wajib ikut pola `modules/sip/{module.json, schema.prisma, api/, components/, pages/, admin/pages/}` — sama seperti `modules/lazsip/` (lihat `CLAUDE.md` §4).
4. Legalitas (nomor akta, izin LAZ) yang diseed dari `insanpeduli.org` adalah data publik yang sudah mereka terbitkan sendiri — bukan asumsi, tapi tetap harus bisa diedit admin kalau ada pembaruan.

## 7. Kebutuhan Non-Fungsional

- Upload gambar (foto pengurus, program, blog, kegiatan, mitra, laporan PDF) — reuse pola upload lokal LAZSIP (disk, provisional) dengan endpoint upload sendiri di `modules/sip/api/routes/upload/`.
- Responsif mobile-first.
- Registrasi modul baru: tambah baris `sip` ke tabel `modules` Core (seed), beri akses ke akun admin yang relevan lewat `/admin/super/akun`.

## 8. Pertanyaan yang Sudah Terjawab dari Riset

- **Blog SIP vs Berita LAZSIP**: tetap terpisah — Blog SIP untuk konten umum yayasan, Berita LAZSIP tetap spesifik kegiatan LAZSIP. (Sebelumnya jadi open question di `PRD.md` §5, sekarang diputuskan begini kecuali ada revisi.)
- **Halaman Divisi**: LAZ SIP link ke modul `lazsip` yang sudah jadi; SAR SIP & Mahad Tahfidz tampil sebagai kartu "segera hadir" (belum ada modulnya) sampai Fase 3/4/5 selesai.
- **Format Laporan**: situs lama pakai link Google Drive eksternal per entri — modul baru dukung dua opsi (link eksternal ATAU upload sendiri) supaya operasional bisa lanjut pakai kebiasaan lama sambil punya opsi upload native.

## 9. Definition of Done

- Semua fitur publik & admin di atas berjalan dengan data nyata dari database.
- Tautan "Infaq Sekarang" & tombol infaq per program mengarah ke campaign LAZSIP yang benar.
- Kartu Divisi menautkan ke modul yang sudah ada (LAZSIP) dan menampilkan status "segera hadir" untuk yang belum ada.
- Modul 100% berada di `modules/sip/`, tidak ada kode yang nyasar ke `modules/lazsip/` atau sebaliknya.
- `insanpeduli.org` bisa sepenuhnya digantikan.
