# Alur Kerja Git — Project SIPERP

Contoh alur kerja nyata dari task masuk sampai selesai, untuk tim developer `djofan/siperp`.

**Skenario contoh:** Developer A dapat task "tambah fitur export laporan donasi ke Excel" di modul `lazsip`.

---

## 1. Sinkron dulu sebelum mulai setiap hari

Sebelum mulai, pastikan kerjaan lokal bersih dan `main` sudah terbaru:

```bash
git checkout main
git pull origin main
```

Wajib dilakukan tiap mulai task baru, supaya branch baru dibuat dari titik paling update.

## 2. Buat branch baru dari main

misal:

```bash
git checkout -b feature/lazsip-export-donasi
```

Nama branch jelas menyebut modul + fitur, sesuai konvensi yang disepakati:

- `feature/nama-modul-fitur`
- `fix/deskripsi-singkat`
- `refactor/nama-bagian`

## 3. Coding & commit

Kerja seperti biasa di editor, commit bertahap:

```bash
git add .
git commit -m "feat: tambah endpoint export donasi ke excel"
```

Boleh beberapa kali commit kecil selama proses, tidak harus satu commit besar di akhir.

## 4. Push branch ke GitHub

```bash
git push origin feature/lazsip-export-donasi
```

Karena branch protection aktif di `main`, push langsung ke `main` otomatis ditolak GitHub — jadi push ke branch sendiri ini yang benar.

## 5. Buka Pull Request

Di GitHub, klik **"Compare & pull request"** yang muncul otomatis setelah push.

- Isi judul singkat + deskripsi apa yang berubah
- Set base: `main` ← compare: `feature/lazsip-export-donasi`
- Assign developer lain (atau coordinator) sebagai reviewer

## 6. Review & revisi (kalau ada)

Reviewer buka tab **"Files changed"** di PR, baca perubahannya. Kalau ada yang perlu diperbaiki, kasih komentar inline langsung di baris kodenya lewat GitHub.

Developer yang membuat PR melihat komentar itu, perbaiki di lokal, commit lagi, push lagi ke branch yang sama — otomatis update PR yang sama, **tidak perlu bikin PR baru**.

## 7. Approve & merge

Kalau sudah oke, reviewer klik **"Approve"**. Karena branch protection minta minimal 1 approval, tombol **"Merge pull request"** baru bisa diklik setelah itu.

Kalau selama proses review ternyata `main` sudah berubah (ada PR lain yang merge duluan), GitHub akan minta update branch dulu — klik **"Update branch"**, baru merge.

## 8. Semua orang sinkron ulang

Setelah merge, semua developer (termasuk yang sedang kerja di branch lain) sinkron ulang:

```bash
git checkout main
git pull origin main
```

Branch `feature/lazsip-export-donasi` boleh dihapus setelah merge (GitHub biasanya menawarkan tombol **"Delete branch"** otomatis).

---

## Catatan penting

Titik yang paling sering kelupaan tim kecil: **step 8**. Developer yang sedang kerja di branch lain juga harus rutin `pull` dari `main` — bukan cuma saat mau membuat PR — supaya kerjaannya tidak makin jauh ketinggalan dan berisiko menimbulkan merge conflict yang besar.
