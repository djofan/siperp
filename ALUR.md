# Alur Kerja Git — Project SIPERP

Contoh alur kerja nyata dari task masuk sampai selesai, untuk tim developer `djofan/siperp`.

**Skenario contoh:** Developer A dapat task "tambah fitur export laporan donasi ke Excel" di modul `lazsip`.

> Repo ini berisi **frontend Next.js** (root) dan **backend Laravel** (`api/`). Alurnya sama untuk keduanya; yang berbeda hanya daftar pengecekan sebelum PR (lihat bagian 3 dan 5) dan urutan kerja bila perubahan menyentuh keduanya (bagian 9). Arsitektur lengkap: [`docs/arsitektur.md`](docs/arsitektur.md).

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

Contoh untuk sisi Laravel: `feature/laravel-core-auth`, `feature/lazsip-api-campaigns`. Untuk pekerjaan yang hanya dokumentasi: `docs/deskripsi-singkat`.

## 3. Coding & commit

Kerja seperti biasa di editor, commit bertahap:

```bash
git add .
git commit -m "feat: tambah endpoint export donasi ke excel"
```

Boleh beberapa kali commit kecil selama proses, tidak harus satu commit besar di akhir.

**Sebelum commit terakhir, jalankan pengecekan sesuai sisi yang kamu ubah:**

| Yang diubah | Jalankan |
|---|---|
| Frontend / Next.js | `npm run lint`, `npm test`, dan `npm run build` |
| Backend / Laravel (`api/`) | di folder `api/`: `composer test`, `composer analyse`, `composer lint`, `composer docs:check` |
| Endpoint API (bentuk request/respons) | `composer docs` untuk memperbarui `api/docs/openapi.json`, lalu `composer docs:check` |

**Jangan pernah ikut di-commit** (repo ini **publik**): `.env` yang terisi, `api/.env`, dump database, file `clone.local.*`, token atau password. Cek `git status` sebelum `git add .`; kalau ragu, `git add` per file.

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

Isi deskripsi PR dengan lima poin ini:

1. **Apa yang dikerjakan** — satu-dua kalimat.
2. **Kenapa dikerjakan** — kebutuhan atau masalah yang diselesaikan.
3. **Apa saja yang berubah** — dipisah per sisi: Frontend, Backend (Laravel/Next.js API), Database (tabel, migration, relasi).
4. **Cara testing** — perintah yang dijalankan dan skenario yang dites (termasuk peran/akses yang dipakai).
5. **Screenshot** — kalau ada perubahan tampilan.

Tandai juga bila PR menyentuh **file bersama** (mis. `prisma.config.ts`, `prisma/seed.ts`, `components/ui/`, `CLAUDE.md`) supaya reviewer memeriksanya lebih teliti.

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

Kalau kamu sedang di branch yang berjalan lama (mis. migrasi ke Laravel), tarik `main` ke branch-mu secara rutin supaya tidak ketinggalan jauh dan konflik tidak menumpuk:

```bash
git checkout feature/nama-branch-kamu
git merge main
```

## 9. Perubahan yang menyentuh frontend dan backend sekaligus

Kontrak antara keduanya adalah `api/docs/openapi.json`. Urutan kerja:

1. **Sepakati bentuk API lebih dulu** (endpoint, request, respons, status error) dan tuangkan di `openapi.json`.
2. **Backend dulu:** implementasi di Laravel + test + `composer docs:check`, lalu PR.
3. **Frontend menyusul:** pakai endpoint yang sudah ter-merge.

Boleh satu PR bila kecil dan dikerjakan satu orang; pecah jadi dua PR (backend lalu frontend) bila besar atau dikerjakan dua orang. Pada PR frontend, sebutkan nomor PR backend-nya. Dua developer dapat mengerjakan sisi masing-masing secara paralel selama berpegang pada kontrak OpenAPI yang sama.

## 10. Catatan untuk perubahan database

- Saat ini tabel dan migration dimiliki Prisma (Next.js). Jangan membuat migration Laravel yang mengubah tabel bisnis, dan jangan menjalankan `migrate:fresh`, `migrate:refresh`, atau `db:wipe`. Keputusan kepemilikan migration jangka panjang: `docs/arsitektur.md` §6.
- Development Laravel hanya memakai salinan `sipmodular_laravel_dev`, tidak pernah `sipmodular_db`.
- Perubahan schema Prisma masuk PR dengan file migration-nya, dan dijelaskan di bagian "Database" deskripsi PR.

Branch `feature/lazsip-export-donasi` boleh dihapus setelah merge (GitHub biasanya menawarkan tombol **"Delete branch"** otomatis).

---

## Catatan penting

Titik yang paling sering kelupaan tim kecil: **step 8**. Developer yang sedang kerja di branch lain juga harus rutin `pull` dari `main` — bukan cuma saat mau membuat PR — supaya kerjaannya tidak makin jauh ketinggalan dan berisiko menimbulkan merge conflict yang besar.
