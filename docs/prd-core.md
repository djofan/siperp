# PRD — Core (Auth, Superadmin, Akses Modul)

> **Status implementasi 29 Oktober 2026:** frontend Next.js, backend Laravel. Uraian Prisma atau backend Next.js di bawah adalah referensi historis kebutuhan produk; ikuti [arsitektur aktif](arsitektur.md) dan README untuk implementasi/deployment.

**Bagian dari:** Platform Modular SIP (lihat `PRD.md` untuk arsitektur & roadmap keseluruhan)
**Fase:** 0 (Fondasi — dikerjakan paralel dengan Fase 1/LAZSIP)
**Stack aktif:** Next.js App Router untuk frontend, Laravel di `api/` untuk autentikasi dan otorisasi, MySQL untuk penyimpanan.
**Status:** Berjalan melalui Core Laravel dan Sanctum.

> **Catatan arsitektur (14 Oktober 2026):** Core adalah dasar dari semua modul lain, sehingga migrasinya ke Laravel (login, logout, otorisasi `module_access`) harus selesai lebih dulu sebelum modul bisnis dimigrasikan. Rincian alur auth dan strategi migrasi ada di [`arsitektur.md`](arsitektur.md) §3 dan §7. Bagian di bawah yang menyebut `app/api/...` dan `getSession()` menggambarkan implementasi Next.js saat ini; kontrak endpoint Laravel untuk Core dibuat saat migrasi Core dimulai. Login **kode akun** Tanwir/Ojol (`/tanwir/masuk`, `/ojol/masuk`) yang menerbitkan sesi Core juga harus diakomodasi saat Core dimigrasikan.

---

## 1. Ringkasan

Core adalah lapisan pondasi yang dipakai **semua modul** (LAZSIP, SARSIP, Pendidikan, Tanwir Qurani, SIP, dan modul baru nanti). Isinya: sistem login, tabel akun, pengaturan siapa boleh akses modul apa, dan dashboard superadmin untuk mengatur semua itu. Core bukan modul yang sejajar dengan LAZSIP dkk — dia lapisan yang ada di bawah/di sekitar semua modul.

**Kenapa ini harus jadi paling pertama:** modul manapun yang punya halaman admin (LAZSIP, SARSIP, dst) butuh Core untuk mengecek "siapa yang sedang login" dan "dia boleh akses modul ini atau tidak" sebelum menampilkan dashboard-nya.

## 2. Fitur

### 2.1 Login
- Halaman `/admin/login` — satu halaman login untuk seluruh platform, dipakai admin modul manapun dan superadmin.
- Autentikasi berbasis sesi. Sesi Next.js saat ini berupa JWT dalam cookie; untuk API Laravel dipakai Sanctum Bearer token (lihat §7 dan `arsitektur.md` §3).
- Setelah login, redirect ke dashboard sesuai akses: kalau cuma punya akses 1 modul → langsung ke dashboard modul itu; kalau lebih dari 1 modul atau superadmin → ke halaman pemilihan modul (`/admin`).

### 2.2 Dashboard Superadmin
- `/admin/super/akun`:
  - Lihat daftar semua akun (nama, email, status aktif).
  - Buat akun baru (nama, email, password awal).
  - Nonaktifkan/hapus akun.
  - Klik satu akun → lihat & atur `module_access`-nya: daftar semua modul terdaftar dengan checkbox/toggle, centang = beri akses, uncheck = cabut akses. Bisa pilih `role` per modul (mis. `admin`, `editor` — role spesifik per modul didefinisikan modul masing-masing, Core cukup menyimpan string role-nya).
- `/admin/super/modul`:
  - Daftar semua modul yang terdaftar di tabel `modules` (nama, slug, status aktif).
  - Fungsinya di fase awal: read-only/referensi. Registrasi modul baru dilakukan lewat seed/migration saat modul itu dibangun (lihat `CLAUDE.md` §8), bukan lewat form UI di fase awal — form tambah-modul-lewat-UI bisa jadi peningkatan di iterasi berikutnya kalau memang dibutuhkan.

### 2.3 Shell Dashboard Admin (dipakai semua modul)
- Layout admin bersama: sidebar, topbar, area konten.
- Sidebar dibangun dinamis: baca `module_access` milik akun yang login, tampilkan menu modul yang dia punya akses saja. Superadmin melihat semua modul otomatis.
- Komponen ini ditaruh di `components/admin-shell/`, dipakai (di-*wrap*) oleh layout admin tiap modul — bukan diduplikasi per modul.

### 2.4 Middleware Proteksi
- `middleware.ts` mengecek setiap request ke `/admin/**`:
  1. Ada sesi valid? Kalau tidak → redirect ke `/admin/login`.
  2. Untuk request ke `/admin/<modul>/**` — akun ini punya `module_access` ke `<modul>` (atau `is_superadmin = true`)? Kalau tidak → tampilkan halaman "tidak punya akses" (bukan redirect diam-diam, supaya jelas kenapa ditolak).

## 3. Skema Data (`prisma/schema/core.prisma`)

```
User
- id            String  @id @default(cuid())
- name          String
- email         String  @unique
- passwordHash  String
- isSuperadmin  Boolean @default(false)
- isActive      Boolean @default(true)
- createdAt     DateTime @default(now())

Module
- id            String  @id @default(cuid())
- slug          String  @unique      // "lazsip", "sarsip", dst
- name          String                // "LAZSIP"
- description   String?
- isActive      Boolean @default(true)

ModuleAccess
- id            String  @id @default(cuid())
- userId        String
- moduleId      String
- role          String                // string bebas, didefinisikan tiap modul (mis. "admin", "editor")
- createdAt     DateTime @default(now())
- user          User    @relation(fields: [userId], references: [id])
- module        Module  @relation(fields: [moduleId], references: [id])
- @@unique([userId, moduleId])         // satu akun cuma boleh punya 1 baris akses per modul
```

## 4. "Kontrak" Fungsi untuk Modul Lain

Ini bagian penting supaya kerja Core dan kerja tiap modul (LAZSIP dkk) bisa paralel tanpa saling menunggu. Modul lain **hanya boleh bergantung ke fungsi-fungsi ini**, bukan detail implementasi internal Core:

```ts
// modules/core/auth.ts

// Ambil sesi user yang sedang login. null kalau belum login.
getSession(): Promise<{ userId: string; isSuperadmin: boolean } | null>  // userId = CUID (string), bukan angka

// Cek apakah user tertentu punya akses ke modul tertentu.
// Superadmin selalu return true tanpa perlu baris ModuleAccess.
hasModuleAccess(userId: string, moduleSlug: string): Promise<boolean>

// Ambil role user di modul tertentu (untuk modul yang butuh bedakan admin/editor dst).
// null kalau tidak punya akses sama sekali.
getModuleRole(userId: string, moduleSlug: string): Promise<string | null>
```

**Kesepakatan kerja:** selama Core belum selesai, modul LAZSIP boleh memakai versi sementara (mock) dari tiga fungsi ini — misal `hasModuleAccess` sementara selalu `return true` supaya pengembangan halaman admin LAZSIP tidak terblokir. Begitu Core selesai, tinggal ganti import ke implementasi asli tanpa mengubah kode halaman LAZSIP.

## 5. Halaman & Endpoint

```
app/admin/login/page.tsx
app/admin/layout.tsx                 shell dashboard (pakai admin-shell)
app/admin/super/akun/page.tsx
app/admin/super/akun/[id]/page.tsx    detail + atur module_access akun ini
app/admin/super/modul/page.tsx        daftar modul (read-only)

app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/super/users/route.ts          CRUD akun (superadmin only)
app/api/super/users/[id]/access/route.ts   atur module_access akun ini
```

**Setelah Core dimigrasikan ke Laravel**, endpoint auth dan akun pindah ke `/api/v1/...` mengikuti `api/docs/CONVENTIONS.md`. Saat ini baru ada `GET /api/v1/health` dan `POST /api/v1/auth/login` (placeholder, balasan 501, belum menerbitkan token). Kontrak endpoint final dibuat saat migrasi Core dan dicatat di `api/docs/openapi.json`.

## 6. Aturan Bisnis

1. Hanya akun `isSuperadmin = true` yang boleh mengakses `/admin/super/**` dan endpoint `api/super/**`.
2. Satu akun hanya boleh punya **satu** baris `ModuleAccess` per modul (dicegah lewat `@@unique([userId, moduleId])`) — kalau perlu ganti role, update baris yang sama, bukan tambah baris baru.
3. Akun yang `isActive = false` tidak bisa login sama sekali, meskipun password benar.
4. Menghapus modul dari tabel `Module` (jarang terjadi) harus mempertimbangkan `ModuleAccess` yang mereferensikannya — sebaiknya nonaktifkan (`isActive = false`), jangan hard-delete.

## 7. Pertanyaan Terbuka

- ~~Sesi pakai cookie session biasa atau JWT?~~ **Terjawab:** sesi Next.js saat ini berupa JWT dalam cookie. Untuk API Laravel, autentikasi memakai Sanctum personal access token (kedaluwarsa absolut 7 hari) yang disimpan Next.js di cookie HttpOnly dan dikirim dari server sebagai `Authorization: Bearer`; keanggotaan modul tidak disimpan di token tapi dicek ke database tiap request. Integrasi login/logout menunggu migrasi Core. Detail: `arsitektur.md` §3.
- Apakah perlu fitur reset password mandiri (lupa password), atau untuk versi awal reset password cukup dilakukan manual oleh superadmin?
- Role per modul (`admin`, `editor`, dst) — apakah daftar role-nya perlu distandarkan lintas modul, atau memang bebas didefinisikan tiap modul sendiri-sendiri?

## 8. Definition of Done

- Login & logout berfungsi, sesi tersimpan dengan aman.
- Superadmin bisa membuat akun baru dan mengatur `module_access`-nya lewat UI (bukan lewat query manual ke database).
- (Fase migrasi) Login, logout, dan otorisasi modul berjalan di Laravel dengan perilaku setara versi Next.js: `users.is_active`, `modules.is_active`, `module_access`, dan bypass superadmin dicek ke database di setiap request.
- Middleware menolak akses ke `/admin/<modul>` bagi akun yang tidak punya `module_access` ke modul itu (dan bagi yang belum login).
- Sidebar admin menampilkan menu sesuai `module_access` akun yang login secara dinamis.
- Tiga fungsi kontrak (`getSession`, `hasModuleAccess`, `getModuleRole`) sudah final dan didokumentasikan, sehingga modul LAZSIP (dan modul-modul berikutnya) bisa mengganti versi mock mereka ke implementasi asli tanpa mengubah kode halaman.


## 9. Design Pattern

- Desain halaman superadmin (Core) — dashboard yang mengatur akun dan
akses ke semua modul (LAZSIP, SARSIP, Pendidikan, Tanwir Qurani).
Ini BUKAN halaman milik satu divisi, jadi jangan pakai warna oranye/
hijau LAZSIP sebagai warna dominan.

REFERENSI LAYOUT
Struktur sama seperti dashboard LAZSIP (sidebar, topbar, grid kartu)
supaya konsisten secara pola navigasi di seluruh platform — tapi
palet warnanya netral, bukan warna satu divisi manapun.

COLOR TOKENS
- ink: #33363B (abu-hitam netral untuk teks utama)
- surface: #FFFFFF dan #F5F6F7 (abu sangat muda untuk background)
- accent: #4C5FD5 (indigo netral — dipakai untuk CTA utama, active
  state sidebar, tombol simpan) — ini warna platform sementara,
  ganti kalau SIP nanti punya warna identitas resmi sendiri
- status: hijau standar (#2FAE60) untuk "akses diberikan"/aktif,
  merah standar (#E5484D) untuk "akses dicabut"/nonaktif — dipakai
  fungsional, bukan dekoratif
- tag warna per modul: dipakai KECIL saja (badge/dot di samping nama
  modul), bukan warna dominan section:
  - LAZSIP: oranye #F79633 / hijau #73AE43
  - SARSIP: emerald + amber (pakai warna yang sudah ada di sarsiplp)
  - Pendidikan & Tanwir Qurani: belum ada warna resmi, pakai abu
    netral dulu sampai ditentukan

TYPE
Sama family dengan dashboard LAZSIP, supaya terasa satu platform —
bedanya cuma di palet warna, bukan di tipografi.

LAYOUT

1) Halaman Login (/admin/login)
   - Satu halaman polos: logo SIP (atau nama "SIP Platform" kalau
     logo belum ada), form email+password, tanpa dekorasi berlebih.
   - Halaman ini yang PERTAMA dilihat semua admin (LAZSIP, SARSIP,
     dst), jadi harus netral — jangan pakai warna divisi manapun.

2) Overview Superadmin (/admin/super)
   - Kartu ringkasan: total akun terdaftar, total modul aktif,
     jumlah perubahan akses 7 hari terakhir.
   - Daftar aktivitas terbaru (mis. "Budi diberi akses ke SARSIP",
     "Akun Siti dinonaktifkan") — supaya perubahan akses terlacak,
     bukan cuma bisa diubah diam-diam.

3) Kelola Akun (/admin/super/akun)
   - Tabel semua akun: nama, email, status aktif/nonaktif, ringkasan
     modul yang diakses (ditampilkan sebagai baris badge kecil warna
     per-modul, mis. badge oranye "LAZSIP", badge emerald "SARSIP").
   - Tombol "Tambah Akun Baru" (accent indigo, satu-satunya elemen
     warna mencolok di halaman ini selain badge modul).
   - Klik satu akun → panel/halaman detail berisi MATRIKS akses:
     baris = daftar semua modul, tiap baris ada toggle on/off +
     dropdown role (admin/editor).