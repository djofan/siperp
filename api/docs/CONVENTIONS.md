# Konvensi REST API Siperp

Upload terenkripsi Rapat memakai path/disk lokal persisten yang sama, dengan adapter
khusus modul: private file 0640 dan directory 2770 (setgid). PHP dan worker memakai
grup www-data yang sama agar worker dapat membaca ciphertext upload; tidak ada akses
world/public. Upload audio dan lampiran melalui helper yang sama agar pembuatan parent
Rapat tidak kembali ke 0700. Disk/izin modul lain tidak diganti. File lama memerlukan
repair izin eksplisit oleh operator; tidak ada perubahan schema atau kunci enkripsi.

Rapat memproses audio plaintext dalam direktori sementara privat milik user worker
di temp OS, bukan direktori storage bersama yang dapat dibuat user PHP berbeda.
Whitelist Python mengikuti direktori privat tersebut. File sementara berizin 0600
dan dibersihkan saat operasi selesai/gagal. Pesan kegagalan membedakan tahap akses
audio, penyiapan sementara, runtime/model, decoder, dan timeout; log hanya mencatat
ID rapat, tahap, kelas exception, dan kode alasan yang dibatasi. Tidak mencatat isi
audio/transkrip, pesan exception mentah, atau path privat. Kontrak field tidak berubah.

Transkripsi Rapat: POST `/api/v1/rapat/meetings/{id}/transcribe` menerima `version`
dan membutuhkan audio tersimpan serta transcriber siap; tidak membutuhkan model
notulen. Respons 202, mode proses read-only `transcribe`, antrean khusus
`rapat-transcription` pada koneksi/tabel Rapat yang sama. Catatan notulen dan status
finalisasi dipertahankan. Cache audio kompatibel dipakai kembali saat retry gagal;
regenerasi eksplisit dari ready mentranskripsi ulang. Hak akses, optimistic lock,
final/arsip/proses tetap berlaku. GET `ai/status` menambahkan flag transcriber dan
summarizer; `configured` tetap berarti keduanya siap. Generate dengan
`useTranscript=true` hanya membutuhkan summarizer. Worker global harus diperbarui
secara eksplisit melalui installer ops agar mendengar `rapat-transcription,rapat`.
Tidak ada migration. Versi worker lama hanya mendengar antrean lama, sehingga tidak
mengambil job transkripsi baru dan tidak mengganti notulen secara tidak sengaja.

LAZSIP campaign `uniqueCode` opsional pada admin: create tanpa field/null/kosong
menyimpan null; omisi update mempertahankan kode lama, sedangkan null/kosong
menghapusnya. Kode nonkosong tetap wajib dua digit dan unik. Campaign berkode
selalu menerapkan kode di server saat pembayaran; input donor tidak dapat
menonaktifkannya. Campaign tanpa kode mempertahankan nominal asli. Deploy hanya
setelah seluruh pembaca pembayaran dan target rollback mendukung kode kosong;
lihat [rollout bertahap](../../docs/lazsip-campaign-code-rollout.md).

Audit antrean Bantuan: GET `/api/v1/bantuan/dashboard` menambahkan `santunanTasks`
berisi `transfer_pending` (Admin/Bendahara) dan `handover_pending` (Admin atau penyalur/
pendamping sesuai penugasan dan peran). Santunan selesai tidak dihitung; tugas lama
tetap dihitung tanpa batas usia. Counter santunan khusus pekerjaan tidak mengikuti
filter periode statistik. Badge dan daftar aplikasi berbagi cakupan `task=survey`
atau `task=distribution`, termasuk akun Relawan dan multi-peran. Counter yang tidak
tersedia/gagal dimuat harus ditampilkan sebagai belum diketahui, bukan 0.

Artikel LAZSIP terpisah dari berita: GET `/api/v1/lazsip/articles` dan
`/articles/{id}` hanya menampilkan status `published`; draft mengembalikan 404.
Admin membaca `/api/v1/lazsip/admin/articles[/{id}]` serta POST/PUT/DELETE
`/api/v1/lazsip/articles[/{id}]` dengan akses LAZSIP aktif seperti pengelolaan berita.
Field wajib: `title` (191), `content` (1.000.000), `status` (`draft`/`published`).
Field opsional: `author` (191), `source` (10.000), `category`
(`zakat`, `qurban`, `infak_sedekah`, `lainnya`). Null mengosongkan field opsional;
omisi pada update mempertahankan nilai. Isi memakai teks/Markdown terbatas tanpa
eksekusi HTML. Daftar terurut terbaru, pagination `page` dan `per_page` 1–100.
Migration baru: `2026_11_20_000004_create_lazsip_articles`; review dan backup sebelum
production. Section `#artikel` terletak sesudah Program Pemberdayaan; admin ada
di `/admin/lazsip/artikel`. Penulis ditampilkan di detail, sumber di akhir artikel.

Dokumen ini wajib menjadi acuan semua modul Laravel. Target adalah Richardson Maturity Level 2: URI mengidentifikasi resource, metode HTTP menyatakan operasi, dan status HTTP menyatakan hasil. HATEOAS penuh tidak diwajibkan. Kontrak v1 yang aktif ada pada `openapi.json`; `openapi.example.json` adalah kontrak demonstrasi khusus test dan tidak boleh dianggap endpoint production.

## Resource, routing, dan versioning

Sumber dana Keuangan mencakup Kas Zakat, ditambahkan melalui migration
`2026_11_19_000003_add_keuangan_zakat_source` tanpa mengubah transaksi lama.
Sesi akun non-superadmin dengan satu akses aktif Keuangan dan role aktif
mengembalikan `panelRedirect: /admin/keuangan`; akun multi-modul tetap memakai
alur pemilihan modul.

Pengajuan lama tanpa penugasan dapat dikirim ke Bendahara melalui POST
`/api/v1/keuangan/expenses/{id}/approval-requests`, berisi UUID `requestId`,
`version`, `treasurerId`, dan `reason` minimal 10 karakter. Khusus penulis pengeluaran;
Bendahara bukan pengirim/pembuat asli. Permintaan menciptakan revisi baru dan tugas
waiting dengan audit, mempertahankan nominal dan fakta keuangan asli. Konflik versi
atau pengajuan yang sudah ditugaskan/berkeputusan ditolak 409. Tidak memberi
persetujuan otomatis. Formulir memformat `4.000.000` tetapi API `amount` tetap string
rupiah utuh `4000000`; tidak menerima titik/koma pada kontrak nilai uang.

Pengajuan Keuangan modern menyertakan `programId`, `requestedOn` (YYYY-MM-DD),
dan `treasurerId` bersama pada POST/PUT expenses. `recipient` dan `recipientIdentity`
opsional. Kategori/sumber dibatasi pilihan formulir; hanya akun `treasurer` aktif
selain pengaju yang dapat ditugaskan. Hanya Bendahara SIP dapat POST decisions,
termasuk revisi keputusan. Role Ketua (`approver`) dihentikan, riwayat tetap tersimpan.
Detail expenses menyertakan `signoffs` minimal (nama, keputusan, ditutup) untuk cetak
oleh seluruh role aktif; catatan/audit tetap dibatasi seperti sebelumnya. Rekaman
legacy tidak diberi tanggal pengajuan buatan. Klien legacy tanpa ketiga field baru
masih dapat memakai aturan nominal; eligibility approver tetap hanya Bendahara.
Migration terkait: `2026_11_19_000001_add_keuangan_application_fields` dan
`2026_11_19_000002_retire_keuangan_chair_access` (review dan backup sebelum VPS).

Rekap tugas Tanwir: endpoint GET `/api/v1/tanwir/admin/task-recaps`,
`/admin/task-recaps/{id}`, dan `/admin/task-recaps/submissions/{id}` khusus admin
Tanwir atau Superadmin. Respons `data` bersifat `private, no-store`; daftar tugas
serta peserta memakai `meta` dengan default 25 dan maksimal 50 baris per halaman.
Filter daftar: `q` (judul), `teacher` (pembuat tugas), `group` (kelompok tujuan),
`type`. Filter rincian: `group` (kelompok peserta saat ini), `q` (nama/kode), `status`.
Ringkasan rincian mengikuti kelompok sebelum filter nama/status. Peserta nonaktif
dan setoran peserta yang sudah pindah kelompok tetap disertakan; tidak merekonstruksi
kelompok historis karena data tersebut tidak tersimpan. Rekap tidak menulis data,
mengubah nilai, atau membuat submission. Media memakai endpoint privat lama,
termasuk berkas tunggal legacy dan batch; path penyimpanan tidak dikirim dalam rekap.
Tidak ada migration untuk fitur ini.

Setoran Tanwir dan Ojol mendukung `files[]` (1–10 audio/video, total maksimal 50 MiB)
pada `POST /api/v1/{module}/submissions`. Field lama `file` tetap didukung, tetapi
tidak boleh digabung dengan `files`. Semua berkas harus sesuai jenis tugas. Batch
disimpan atomik sebagai satu percobaan, dan pengiriman ulang mengganti seluruh batch
yang ditolak. Detail peserta/guru mengembalikan `files` berisi index/nama/MIME/ukuran,
tanpa path privat. Pemutaran memakai endpoint berizin dengan `?index=0..9`.

Deployment perubahan ini memerlukan migration `2026_11_12_150000_add_learning_submission_media_files`.
Backup database sebelum migration di VPS; kemudian build/restart frontend dan backend.
PHP `upload_max_filesize` minimal 50M, `post_max_size` dan Nginx `client_max_body_size`
minimal 64M untuk menampung multipart. File lama tetap bisa diputar tanpa backfill.

Login Bantuan PWA memakai `pwa: true` pada `POST /api/v1/auth/login` dan memerlukan
akses Bantuan aktif. Cookie HttpOnly dan token berlaku 30 hari, terpisah dari durasi
login browser biasa. Tidak ada logout karena idle; logout eksplisit, pencabutan token,
penggantian password yang mencabut sesi, dan penonaktifan akun tetap berlaku. Sesi PWA
lama perlu login ulang sekali agar mendapat durasi baru.

`POST /api/v1/bantuan/applications/{id}/actions/survey_revise` memerlukan `version`.
Hanya verifikator penugasan dapat membuka kembali survei pada `survey_cc_review` atau
`survey_submitted`, sebelum persetujuan nominal. Data dan dokumen dipertahankan; survei
kembali ke `survey_assigned` dan dikirim ulang melalui pemeriksaan Call Center.

Reset password akun operasional: `POST /api/v1/core/module-accounts/{id}/password-reset`
memerlukan akun aktif dan otorisasi admin. Admin modul hanya boleh mereset akun operasional
yang seluruh akses modulnya berada dalam cakupan pengelolaannya; Superadmin boleh lintas modul.
Akun admin, Superadmin, akun sendiri, dan akun tanpa akses operasional ditolak. Request berisi
`password` dan `password_confirmation` (12–72 karakter), tanpa password lama. Respons tidak
mengandung password; server menyimpan hash, mencabut seluruh token target, dan mencatat aktor
serta target tanpa kredensial. Batas 10 permintaan/menit; header respons `no-store, private`.
Daftar akun menyediakan `canResetPassword` untuk UI, tetapi endpoint tetap mengotorisasi ulang.

### Diagnosis error untuk pengelola

`POST /api/v1/bantuan/application-reminders` melewati pengajuan yang tidak memiliki
penerima tugas aktif selain akun pengirim. Respons `data.count` menghitung pengajuan
yang disiapkan, sedangkan `data.skipped` berisi `id`, `number`, `task`, dan `reason`.
Jika semuanya dilewati, respons tetap 200 tanpa notifikasi atau event pengingat baru.
Status usang/tertutup dan pelanggaran akses tetap membatalkan seluruh batch secara atomik.
Pesan WhatsApp tetap diperiksa dan dikirim manual oleh pengguna.

Respons error mempertahankan `error.code`, `message`, dan `details`, serta menambahkan
`diagnosticCode`, `requestId`, dan `retryAfter` (detik atau null). ID dibuat oleh server,
dikembalikan juga dalam header `X-Request-ID`. Untuk error server, cari ID yang sama pada
catatan `api_request_failed` di `storage/logs/laravel.log`. Jangan meminta pengguna mengirim
password, `.env`, token, atau dump database. Jangan menyalakan `APP_DEBUG` di production.

| Kode diagnosis | Arti dan tindak lanjut |
| --- | --- |
| `DB_SCHEMA_MISMATCH` | Tabel/kolom tidak sesuai kode. Periksa status migration dan versi deployment; backup sebelum menerapkan migration. |
| `DB_UNAVAILABLE` | Database tidak terjangkau, akses ditolak, atau konfigurasi database tidak sesuai. Periksa layanan dan konfigurasi koneksi di server. |
| `DATA_ALREADY_EXISTS` | Nilai unik bentrok. Periksa apakah akun/kode/email sudah terdaftar sebelum mengulang. |
| `DATA_CONSTRAINT` | Isian atau referensi data ditolak database. Cocokkan log dengan request ID dan periksa relasi serta skema. |
| `DB_BUSY` | Deadlock atau batas tunggu penguncian. Periksa hasil penyimpanan, tunggu, lalu ulangi bila belum tersimpan. |
| `APP_KEY_MISSING` / `ENCRYPTION_DATA_UNREADABLE` | Periksa konfigurasi enkripsi dan kunci asli. Jangan membuat kunci baru pada deployment rutin. |
| `ORIGIN_NOT_ALLOWED` | Sesuaikan domain HTTPS frontend dengan origin yang diizinkan API. |
| `TOO_MANY_REQUESTS` | Tunggu sesuai `retryAfter` atau header `Retry-After`. |
| `SERVER_INTERNAL_ERROR` / `DB_QUERY_FAILED` | Penyebab belum dapat diklasifikasikan lebih rinci; periksa log memakai request ID. |

Log diagnosis tidak menyertakan request body, SQL/binding, password, token, atau isi exception.
Respons HTTP yang dibuat proxy sebelum mencapai Laravel memakai kode HTTP di frontend dan
belum memiliki ID laporan Laravel; periksa log proxy jika respons berupa HTML/non-JSON.

Kontak pengajuan Bantuan: `applicant.phone` pada POST/PUT applications wajib berisi 8–15 angka
(maksimal 30 karakter dengan format). `applicant.reporterPhone` opsional/nullable, tetapi bila diisi
memakai validasi yang sama. Diperbolehkan satu `+` di awal untuk kode internasional yang tidak diawali 0,
spasi, tanda hubung dan kurung kode area berisi angka yang berpasangan. Huruf/ekstensi dan format tidak valid
ditolak 422 melalui ErrorResource. Draft boleh tidak mengisi nomor, tetapi nomor yang diisi tetap divalidasi.
Format nomor tersimpan dipertahankan. Schema referensi: `BantuanTelephone` pada generator OpenAPI.

Resource memakai kata benda jamak, huruf kecil, kebab-case, di bawah prefix modul: `/api/v1/lazsip/campaigns`, `/api/v1/lazsip/campaigns/{id}`, `/api/v1/payment/destination-accounts`. Nama tabel/kolom lama tidak berubah hanya karena URI menggunakan konvensi baru.

Gunakan `Route::apiResource` sebagai default, dengan `only`/`except` jika operasi tidak tersedia. Provider modul sudah memasang prefix `api/v1/<modul>` dan middleware `api`; jangan menambahkan prefix dua kali. Route dilindungi `auth:sanctum` dan `module.access:<slug>` saat kebijakan Core sudah dimigrasikan.

```php
Route::apiResource('campaigns', CampaignController::class);
```

Endpoint bersama `/api/v1/health` dan `/api/v1/auth/login` tetap dipertahankan sesuai fondasi yang telah disetujui. Keduanya dicatat sebagai pengecualian operasional di bawah. Endpoint bisnis baru selalu berada di bawah modul.

Perubahan yang merusak kompatibilitas menggunakan `/api/v2`, termasuk penggantian nama/tipe field, penghapusan field, perubahan arti status atau kewajiban request. Update OpenAPI dan test kontrak sebelum frontend menggunakan kontrak baru. Jangan mengubah arti v1 diam-diam.

## Metode dan status HTTP

| Metode | Semantik |
| --- | --- |
| GET / HEAD | Membaca resource; tidak boleh mengubah resource bisnis, melakukan pembayaran, menghapus, atau menandai pekerjaan selesai |
| POST | Membuat resource/sub-resource atau menjalankan aksi eksplisit yang tercatat di registri |
| PUT | Mengganti seluruh representasi field yang dapat ditulis; semua field itu wajib hadir, termasuk field nullable yang harus dikirim null |
| PATCH | Mengubah hanya field yang dikirim; field yang tidak dikirim tetap; minimal satu field yang dapat ditulis |
| DELETE | Menghapus resource; pengulangan tidak membuat efek tambahan meskipun status berikutnya dapat 404 |

`apiResource` mengarahkan PUT dan PATCH ke `update`; Form Request wajib membedakan keduanya dengan `isMethod('PUT')`. Field yang dikelola server seperti id, pemilik dan timestamp tidak diganti oleh PUT. Jangan memakai POST untuk membaca koleksi atau GET untuk aksi mutasi. Alur OTP riwayat donor lama tetap berada di Next.js sampai dimigrasikan: Laravel nanti membuat challenge/verifikasi melalui POST, lalu membaca riwayat yang telah diotorisasi melalui GET.

HTTP safe method mengizinkan efek samping insidental berupa log/audit; Sanctum memperbarui `last_used_at` saat Bearer dipakai, termasuk GET, tanpa mengubah resource bisnis atau memperpanjang masa token. Ini sesuai [RFC 9110 §9.2.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1). Tidak ada aksi bisnis yang disembunyikan di GET.

| Status | Penggunaan |
| --- | --- |
| 200 | Pembacaan atau perubahan yang mengembalikan representasi |
| 201 | Resource dibuat; wajib header Location ke URI resource, termasuk replay idempotensi yang semula 201 |
| 204 | Berhasil tanpa representasi; body harus kosong, tidak ada `{data:null}` |
| 400 | Request tidak dapat diparse, misalnya JSON malformed |
| 401 | Bearer tidak ada, invalid atau kedaluwarsa |
| 403 | Identitas valid tetapi tidak diizinkan |
| 404 | Resource/route tidak ditemukan; dapat dipakai untuk menyembunyikan keberadaan resource sesuai kebijakan privasi |
| 409 | Konflik keadaan bisnis atau key idempotensi dipakai dengan payload berbeda |
| 422 | Validasi Form Request gagal |
| 429 | Rate limit; sertakan Retry-After |
| 5xx | Gangguan server/dependency atau placeholder 501; pesan umum tanpa SQL, stack trace, kredensial atau path internal |

Health memakai 503 saat koneksi database tidak tersedia; hanya status ketersediaan yang ditampilkan. Login placeholder tetap 501 dengan pesan umum dan kode `not_implemented`.

## Representasi, koleksi, dan privasi

Semua body JSON, termasuk error, melalui API Resource. Respons tunggal berbentuk `{"data":{...}}`. Koleksi wajib paginasi berbentuk `{"data":[...],"meta":{...},"links":{...}}`. Gunakan Resource::collection atas paginator agar links/meta konsisten. Respons 204 dan HEAD tidak memiliki body dan merupakan pengecualian representasi, bukan respons JSON ad hoc.

Default page=1 dan per_page=25; maksimum per_page=100. Nilai di luar batas ditolak 422, bukan dipotong diam-diam. Tidak boleh mengembalikan koleksi tidak terbatas. `App/Http/Requests/CollectionRequest` menyediakan batas bersama; turunan mendefinisikan whitelist filter/sort dan aturan tiap filter.

- Filter: `?filter[status]=pending`; nama dan nilai filter wajib masuk whitelist.
- Urutan: `?sort=name` ascending, `?sort=-name` descending. Setiap resource mendokumentasikan field yang didukung. Jika memakai banyak field, sintaks dan whitelist harus ditambahkan pada kontrak terlebih dahulu. Selalu ada tie-breaker id untuk hasil stabil.
- Pencarian: `?q=kata`, maksimum 200 karakter. Hanya cari field yang diizinkan; jangan jadikan email/telepon atau identifier rahasia donor sebagai pencarian publik.
- Link paginasi mempertahankan query yang tervalidasi. `meta` memuat current_page, per_page, total, last_page; `links` memuat first, last, prev, next.

API Resource wajib memilih field secara eksplisit. Jangan mengirim `$model->toArray()`, seluruh hasil ORM, atau hanya mengandalkan `$hidden`. Aturan ini mempertahankan privasi yang sudah diterapkan payment/lazsip: keluaran riwayat publik tidak membawa identitas donor, email, telepon, tracking code atau credential checkout. Field sensitif yang memang diperlukan pada alur privat harus diotorisasi dan dicatat eksplisit pada kontrak. Contoh resource hanya memilih id, name, amount, status; owner_id dan private_notes tidak pernah tampil pada respons tunggal maupun koleksi.

Error memakai `ErrorResource` tanpa wrapper data:

```json
{"error":{"code":"validation_failed","message":"...","details":{"email":["..."]}}}
```

`details` kosong adalah objek `{}`. Error 5xx memakai pesan umum; detail hanya dicatat pada log internal. Kode stabil mencakup bad_request, unauthenticated, forbidden, not_found, conflict, validation_failed, rate_limited, not_implemented, server_error.

## Registri sub-resource dan pengecualian aksi

Daftar berikut membedakan endpoint aktif dari rancangan migrasi; tidak ada endpoint modul bisnis yang dibuat pada fondasi ini. Aksi tambahan wajib dicatat di tabel ini beserta alasan, metode, bentuk request/response dan kontraknya sebelum implementasi.

| Endpoint | Metode | Keadaan | Alasan |
| --- | --- | --- | --- |
| `/api/v1/lazsip/affiliate/referrals/{code}` | GET | Aktif | Resolusi publik kode acak 20 hex. Hanya mengembalikan referralCode; tidak mengekspos identitas pemilik. Akun/affiliator/modul nonaktif atau kode invalid mengembalikan 404. Tidak mencatat klik, transaksi atau komisi. Link frontend `/lazsip/r/{code}` mengarahkan ke `/lazsip/zakat?ref={code}` setelah verifikasi; no-store. |
| `/api/v1/lazsip/affiliate/registrations` | POST | Aktif | Pendaftaran terbuka tanpa persetujuan admin. Membuat akun Core dan profil affiliator aktif secara atomik, tanpa module_access atau hak admin. Request name/email/phone/password/password_confirmation; 201 Resource profil sendiri + Location affiliate/me + cookie sip_session HttpOnly; no-store, private; 5/menit. |
| `/api/v1/lazsip/affiliate/sessions` | POST | Aktif | Login affiliator memakai email/password akun Core (email di-trim dan dinormalisasi lowercase), AffiliateLoginRequest, throttle:affiliate-login (5/menit per email+IP), dan TokenIssuer Core. Login ERP lain tetap memakai kode akun. Akun ERP aktif dapat otomatis bergabung, tanpa mengubah izin modul; keanggotaan nonaktif tidak diaktifkan ulang. 200 profil sendiri + cookie HttpOnly, tanpa token dalam body. |
| `/api/v1/lazsip/affiliate/me` | GET / PUT | Aktif | Resource profil milik pengguna terautentikasi, user/keanggotaan aktif dan status publik LAZSIP diperiksa. PUT mengganti name/email/phone saja secara atomik; name/email juga dipakai Core. Tidak ada komisi atau pencairan dalam fase akun ini. |
| `/api/v1/bantuan/mobile/login` | POST | Aktif | Login akun ERP melalui `LoginRequest` Core dan `throttle:login`; JSON `{code,password}`. Akun aktif dan akses Bantuan diperiksa sebelum `TokenIssuer` menerbitkan token `bantuan-mobile`. Respons 200 `{data:{token,expires_at}}` dengan `Cache-Control: no-store`, tanpa cookie. Error 401/403/422/429 memakai `ErrorResource`. Superadmin mengikuti pengecualian status modul Core; modul wajib terdaftar. |
| `/api/v1/health` | GET | Aktif | Singleton diagnostik yang sudah disepakati; bukan koleksi atau aksi CRUD bisnis |
| `/api/v1/academy/admin/participant-imports` | POST | Aktif | Aksi impor atomik maksimal 200 peserta dari Excel; admin Academy/superadmin saja. Respons 200 Resource berisi jumlah dibuat/dilewati dan akun baru, dengan `Cache-Control: no-store, private`. Password awal hanya pada respons ini, disimpan sebagai hash; impor ulang data sama di angkatan/grup sama melewati akun tanpa mengganti password. Konflik nomor HP dengan data/angkatan berbeda membatalkan semua baris (422). |
| `/api/v1/auth/login` | POST | Placeholder 501 | Aksi autentikasi yang kelak menerbitkan token; password tidak boleh menjadi query GET |
| `/api/v1/payment/transactions/{id}/checkout-sessions` | POST | Rancangan; belum aktif | Membuat sub-resource sesi checkout pada provider pembayaran; ada efek eksternal |
| `/api/v1/payment/webhook-deliveries` | POST | Rancangan; belum aktif | Menerima event provider dan membuat catatan penerimaan; verifikasi signature serta deduplikasi event wajib |
| `/api/v1/lazsip/zakat-calculations` | POST | Rancangan; belum aktif | Membuat hasil perhitungan dari input terstruktur; tidak menjadi POST untuk membaca koleksi |
| `/api/v1/lazsip/programs/{id}/registrations` | POST | Rancangan; belum aktif | Membuat sub-resource pendaftaran; bukan aksi GET yang mengubah program |

Rancangan ini adalah acuan bentuk URI, bukan janji kontrak bisnis yang sudah tersedia. Lokasi/mode autentikasi webhook dan field perhitungan/pendaftaran ditetapkan saat modul dimigrasikan. `POST /api/v1/payment/transactions` adalah CRUD pembuatan resource, bukan pengecualian aksi.

## Idempotensi pembuatan pembayaran

Endpoint pembuatan pembayaran wajib menerima dan memvalidasi header `Idempotency-Key`. `IdempotentCreationRequest` mengambil nilai dari header, sehingga field body tidak dapat menggantikannya. Key wajib 1–128 karakter ASCII alfanumerik atau `. _ : -`; key invalid/absen menghasilkan 422.

Implementasi Payment kelak wajib:

1. Scope key berdasarkan identitas/tenant, operasi dan versi endpoint; bukan key global lintas pengguna.
2. Normalisasikan payload tervalidasi sebelum membuat fingerprint; perubahan urutan JSON tidak dianggap payload berbeda.
3. Persist key, fingerprint dan hasil melalui transaksi atomik dengan unique constraint scope/key sebelum membuat transaksi pembayaran. Request bersamaan harus menghasilkan satu transaksi.
4. Key/payload sama mengembalikan status, body dan Location awal tanpa transaksi/charge tambahan. Key sama/payload berbeda menghasilkan 409.
5. Tetapkan masa retensi dan perilaku request yang masih diproses pada kontrak migrasi Payment. Jangan memilih masa retensi atau membuat ulang charge setelah key habis tanpa kebijakan yang disetujui. Teruskan mekanisme idempotensi provider bila tersedia; database lokal saja tidak menjamin exactly-once efek eksternal setelah crash.
6. Webhook memakai deduplikasi berdasarkan event provider yang tervalidasi, terpisah dari key pembuatan yang dikirim frontend.

Fondasi ini belum mengimplementasikan storage idempotensi production, karena Payment belum dimigrasikan. Contoh khusus test memakai repository in-memory untuk membuktikan replay, scope pengguna dan konflik payload secara berurutan. Contoh tidak mengklaim ketahanan restart atau concurrency antarworker. Replay tidak membangkitkan resource yang telah dihapus.

## Stateless dan otorisasi

Setiap request terlindungi membawa `Authorization: Bearer <token>`; server tidak membaca sesi dari cookie atau memakai stateful Sanctum SPA. API middleware tidak memasang StartSession, Sanctum guard sesi/stateful domain kosong, dan route csrf-cookie tidak aktif. SESSION_DRIVER=file hanya konfigurasi fallback framework yang tidak digunakan pada pipeline API.

Token Sanctum disimpan sebagai hash untuk validasi/revokasi dan kedaluwarsa absolut tujuh hari. Penyimpanan kredensial/resource/audit/idempotensi tidak merupakan sesi percakapan HTTP: request tetap mandiri dan selalu membawa identitas. Next.js kelak menyimpan token pada cookie HttpOnly miliknya dan server Next menambahkan Authorization; browser tidak memanggil API Laravel langsung.

Otorisasi modul dibaca dari database pada setiap request, bukan klaim token. Middleware module.access masih menolak akses 501 sampai migrasi Core. Contoh menguji Bearer melalui auth:sanctum dan hanya memperagakan kepemilikan resource fiktif; itu tidak menggantikan kebijakan Core.

## OpenAPI dan perubahan kontrak

`api/docs/openapi.json` adalah sumber kebenaran kontrak API aktif bagi backend/frontend. `api/docs/openapi.example.json` adalah kontrak contoh dengan `x-example-only=true`. Keduanya OpenAPI 3.1.0 dan dihasilkan secara deterministik oleh `api/tools/export-openapi.mjs`. Fondasi memakai generator kontrak eksplisit yang kecil, bukan inferensi otomatis Scramble/Scribe; semua penambahan route harus ditambahkan ke generator, diekspor, direview dan diuji. Tidak ada route dokumentasi production tambahan.

```bat
cd api
composer docs
composer docs:check
php artisan test
```

Jangan mengedit JSON keluaran secara manual. Generator adalah input pemeliharaan; artifact JSON yang direview adalah kontrak integrasi. Test mengecek drift artifact dan kesesuaian route/metode aktif dengan kontrak. Respons runtime diuji memakai validator JSON Schema AJV yang sudah terkunci pada dependency development root, termasuk whitelist output dan header yang diwajibkan. Validator memakai subset JSON Schema yang kompatibel dengan draft-07 pada schema OpenAPI 3.1 ini; ia bukan validator seluruh dokumen OpenAPI atau alat deteksi semua breaking change. Jalankan `npm ci` root untuk menyediakan tooling test.

Saat migrasi modul, update registri aksi, generator dan OpenAPI dalam perubahan yang sama. Tambahkan test request/response dan status untuk route baru; frontend membaca OpenAPI, bukan menebak bentuk hasil controller. Perubahan kompatibilitas ditinjau terhadap kontrak v1 sebelum membuat v2.

## Contoh resource lengkap dan test

`tests/Fixtures/Rest/register.php` menggunakan apiResource untuk `/api/v1/examples/payment-attempts`, dengan index, store, show, update (PUT/PATCH), destroy. Route hanya didaftarkan oleh test; tidak ada modul Payment atau tabel bisnis baru.

Contoh menunjukkan POST 201 + Location, replay idempotensi, 409 payload berbeda, GET tunggal/koleksi tanpa mutasi resource, query filter/sort/q, paginasi dan batas 100, PUT penuh, PATCH sebagian, DELETE 204 tanpa body, 401 tanpa Bearer/cookie-only, 403 kepemilikan, 404 resource hilang, 422 validasi. Test terpisah memverifikasi malformed JSON 400, limiter 429 dan sanitasi 500/501. Setiap respons contoh dengan body memakai Resource dan diuji terhadap OpenAPI, dengan field privat dilarang muncul.

Contoh respons pembuatan:

```http
HTTP/1.1 201 Created
Location: http://localhost:8000/api/v1/examples/payment-attempts/cmv7example000000000000000
Content-Type: application/json

{"data":{"id":"cmv7example000000000000000","name":"Alpha","amount":100,"status":"pending"}}
```

ID ilustratif; test menggunakan CUID asli. Jalankan `php artisan test --filter=RestConventionsTest` dan `php artisan test --filter=OpenApiContractTest`. Hasil keseluruhan dicatat pada `api/VERIFICATION.md`.

## Bantuan mobile push
POST /api/v1/bantuan/mobile/devices mendaftarkan atau merotasi perangkat sesi mobile (token string maksimal 4096, respons 204). DELETE pada URI sama menghapus perangkat sesi saat ini (204). DELETE /api/v1/bantuan/mobile/session mencabut token sesi dan perangkatnya (204). Semua membutuhkan Sanctum bantuan-mobile; registrasi perangkat memeriksa user.active dan module.access:bantuan. Logout tetap tersedia saat akses modul dicabut. Tidak ada token yang dikembalikan. Error mengikuti ErrorResource. Registrasi dibatasi 60 request/menit. Kontrak dihasilkan oleh tools/export-openapi.mjs.

## Periode santunan rutin

`POST /api/v1/bantuan/santunan/periods` membuat kumpulan santunan rutin bulan berikutnya.
Request `{sourcePeriod: "YYYY-MM"}`; admin/bendahara saja. Respons 201 melalui API Resource
berisi `data.period` dan `data.createdCount`, Location menunjuk daftar santunan dengan filter
`period`. 409 bila rutin bulan tujuan sudah ada; 422 bila sumber kosong atau penyalur tidak aktif.
Penyalinan atomik dan diserialisasi pada registri modul; laporan, status, dan dokumen tidak disalin.

## Kategori santunan dan kertas bantuan

`POST /api/v1/bantuan/santunan` menerima kategori rutin `widow`, `orphan`,
`foster_child`, `tahfidz` (Lembaga Tahfidz), `education` (Pendidikan), dan `general` (Umum). Tidak rutin mendukung `orphan`, `tahfidz`, `education`, `general`.
Kategori disimpan pada kolom string yang sudah ada, tanpa migration. Kontrak
input diekspor oleh `node api/tools/export-santunan-openapi.mjs`. Template
kertas bantuan merupakan aset statis tanpa data penerima; hasil terisi
dibuat di browser dari data santunan yang sudah diotorisasi.

## Push PWA Bantuan

- `GET /api/v1/bantuan/pwa/push-context`: sesi web `next-server`, akun aktif,
  akses Bantuan. Respons Resource 200 berisi konfigurasi Firebase Web publik,
  VAPID publik, status registrasi dan binding sesi HMAC, dengan no-store.
  Kunci service account, token Sanctum, dan path server tidak dikirim.
- `POST /api/v1/bantuan/pwa/devices`: `{token}` FCM Web, 204 tanpa body,
  validasi 422, akses 401/403, server belum dikonfigurasi 503. Upsert per sesi,
  token dienkripsi. Token browser yang sama berpindah ke sesi pemilik baru.
- `DELETE /api/v1/bantuan/pwa/devices`: hapus registrasi sesi web saat ini,
  204 tanpa body; tetap tersedia setelah akses modul dicabut. Cookie mutasi
  memakai pemeriksaan Origin Core. Endpoint native mobile tidak dilonggarkan.
- `bantuan:push` mengirim kanal mobile dan PWA. PWA menggunakan pesan data-only
  generik dengan binding sesi; service worker memeriksa konteks sesi langsung
  sebelum menampilkan notifikasi dan hanya membuka halaman notifikasi internal.

## Bukti santunan

`POST /api/v1/bantuan/santunan/{id}/documents` menerima multipart `kind` dan `file`
(JPEG/PNG/WEBP, maksimal 2048 KiB). `aid_paper` dan `recipient_photo` wajib untuk
menyelesaikan laporan; `transfer_receipt` opsional. Ketiganya disimpan terenkripsi
dan hanya dapat dibaca lewat endpoint privat dengan otorisasi santunan yang sama.
Unggah hanya setelah transfer dan sebelum selesai; satu dokumen per jenis.

## Cakupan daftar Pengajuan Bantuan

Akun yang hanya memiliki kombinasi role `requester`, `verifier`, dan `volunteer` hanya dapat melihat pengajuan yang dibuatnya atau ditugaskan kepadanya melalui `verifier_id` / `distributor_id`. Gabungan role dinilai secara union: adanya `admin`, `call_center`, `approver`, `chair`, `fund_requester`, atau `treasurer` memberikan cakupan seluruh pengajuan, termasuk yang belum ditetapkan nominalnya. Cakupan yang sama dipakai daftar, detail, ringkasan, ekspor, dan filter `view=ongoing`; filter berjalan tetap mengecualikan draft/status akhir. Izin tindakan dan akses dokumen/data sensitif tetap diperiksa terpisah.

Ringkasan pengajuan Bantuan menyertakan `shortLocation` (maks. 100 karakter): kecamatan dan kota tanpa prefiks administratif, atau wilayah jika belum diisi. Tidak menyertakan alamat jalan, NIK, atau nomor telepon. Cakupan akses daftar tetap berlaku.

Peran Bantuan `observer` (Pengurus) membaca seluruh pengajuan, data pemohon, dokumen, riwayat, dan kelompok dana. Hanya aksi pengajuan `comment` diizinkan; membuat/mengubah/menghapus pengajuan, dokumen, reminder, keputusan, dan pencairan tetap memerlukan peran operasional terkait. Akun multi-role mempertahankan gabungan hak eksplisit.

Peran Bantuan `survey_approver` (Penyetuju Survei) hanya mengambil keputusan `review1_approve`, `review1_reject`, atau `request_data` pada tahap `review1`, serta catatan internal. Tidak berhak memutuskan nominal, hasil survei, atau bypass. Larangan keputusan atas pengajuan sendiri tetap berlaku. Keputusan pertama dengan version valid berlaku; peran Approver/Ketua tetap dapat menangani tahap awal. Notifikasi tahap review1 turut ditujukan ke Penyetuju Survei yang memenuhi syarat.


### Bantuan: pencatatan proses manual

`POST /api/v1/bantuan/applications/{id}/manual-processes` mencatat satu kegiatan yang sudah dilakukan di luar web (WA, Telegram, lainnya). Hanya Call Center, admin modul, dan Superadmin. Request memuat `action`, `version`, `manual` (pelaksana akun aktif sesuai peran atau nama petugas eksternal, tanggal kegiatan, sumber, referensi), dan payload bisnis tahap terkait. Respons 200 adalah detail pengajuan terotorisasi. Validasi kelengkapan, bukti, status, versi, serta konsistensi kartu dana tetap mengikuti Workflow. Identitas akun pencatat tidak pernah diganti; atribusi pelaksana dan sumber terenkripsi disimpan pada pengajuan dan audit. Petugas eksternal bukan akun login dan tidak memperoleh akses. Pelaksana survei/penyerahan harus sesuai penugasan. Tidak ada perubahan status sembarang atau pemalsuan sesi petugas.

Pencarian daftar Bantuan (`search`) mendukung gabungan kata pada nama/nomor pengajuan, program, wilayah, status, sumber, nominal, tanggal, serta nama/kode pembuat dan petugas terkait. Alamat pemohon/alamat survei, telepon, pekerjaan, masalah dan catatan hanya dicocokkan jika pemanggil berhak membaca detail sensitif baris tersebut. NIK tetap persis 16 digit. Pemindaian field terenkripsi dilakukan secara streaming pada baris yang sudah dibatasi akses dan filter, tanpa indeks plaintext.

Keputusan dana manual untuk kartu grup memakai `POST /api/v1/bantuan/funding-requests/{id}/manual-decision`. Call Center/admin/Superadmin mengirim atribusi manual beserta versi kartu dan versi seluruh item; keputusan atomik berlaku untuk seluruh grup. Endpoint manual per-pengajuan tetap menolak pemutusan satu item dalam kartu aktif.

## Lokasi foto Bantuan

Upload dokumen pengajuan dan santunan menerima objek multipart opsional
`location[latitude]`, `location[longitude]`, `location[source]` (`exif`/`device`),
serta `location[accuracy]` opsional dalam meter. Pasangan koordinat dan sumber
wajib lengkap jika location diberikan; rentang latitude -90..90, longitude
-180..180, accuracy 0..10000000. Field di luar whitelist ditolak 422.
Lokasi disimpan terenkripsi, tidak ditulis ke log/audit. Representasi dokumen
privat menambahkan `location` nullable; foto lama null. Filtering dan izin foto
berlaku juga untuk koordinat. Source menandakan asal klaim klien, bukan bukti
terverifikasi. Tidak ada endpoint lokasi publik atau perubahan izin dokumen.

Academy: POST /api/v1/academy/admin/cohorts/{id}/chapters requires Academy admin, prepares at least 12 chapters and duration 30 days transactionally and idempotently; returns data.courseId. Existing content is preserved. New cohorts are prepared automatically.

Academy teacher materials POST accepts optional multipart file (audio <=50 MB), saved atomically with publication. Missing file/videoUrl preserves existing audio on edit. WebM browser audio uses the existing protected file endpoint.

Daily teacher material form: release day and order inputs removed. New lessons append under a chapter lock; edits retain position. Teacher saves set releaseDay=1, respecting course start and publication/access rules. Existing unsaved materials and quiz schedules remain unchanged.

Teacher material table: GET /api/v1/academy/teacher/materials?view=table&cohort={cohortId}&page=1 returns paginated lesson rows (10/page), actual cohort/chapter labels, publication/audio information, selector metadata and totals. Cohort filter is applied in Laravel before pagination; changing filters resets the page in the UI. Legacy requests without view=table keep their chapter response.

Academy questions accept one optional private media upload: JPG/PNG/WebP images up to 5 MB or MP3/WAV/OGG/M4A/WebM audio up to 15 MB. Store only the private disk path; expose metadata in question payloads and stream bytes through authenticated `GET /api/v1/academy/questions/{id}/media`. Participant access must repeat quiz/enrollment authorization. Replacing or deleting a question cleans up its owned media file.

Teacher exam and question tables: GET teacher/quizzes?view=table supports cohort filter and page; GET teacher/quizzes/{id}?view=table supports question page. Both use 10 rows/page in Laravel with stable ordering and clamp excess pages. Legacy response remains without view=table. Question keys/options require teacher/admin authorization. UI exposes exam configuration and question editing separately from table rows.

Teacher exam creation: DAILY selects cohort curriculum and chapter; WEEKLY/FINAL select cohort curriculum only (courseId). Backend retains an internal chapter relationship for compatibility and preserves existing relationships on edit. The UI labels weekly/final scope as all chapters.

Academy UX: teacher/admin dashboards include workflow guides; participant dashboard prioritizes recent cohort materials and exam reminders. GET materials accepts sort=latest (created_at desc,id desc), preserving cohort/publication access. Material forms offer explicit draft/publish actions. Exam activation includes a review of scope, question count, duration and WIB schedule; server publication validation remains authoritative. No automatic activation or messaging is performed by dashboard guides.

Teacher Q&A: GET teacher/questions?view=table&page=1 returns 10 discussions/page (unanswered first); GET teacher/questions/{id} reads private detail. Teacher/admin authorization applies to both and the existing answer PUT. The dedicated answer page redirects back to the table after a successful save, preserving page and showing confirmation; validation errors remain on the answer form.

Participant Q&A now has a 10-row paginated table, separate create/detail pages, and return-to-table confirmation on successful submission. GET learning/discussions?view=table uses the existing participant/enrollment scope; GET learning/discussions/{id} returns only owned discussions in published enrolled courses (foreign IDs 404). Session schedules remain accessible below the table.

Live Q&A scheduling UI: teacher Questions > Live session schedule tab. Select cohort curriculum, title, future WIB datetime and meeting URL. Existing POST courses/{courseId}/sessions creates the schedule; new GET teacher/sessions returns manager-only options and a 10-row paginated session list. Enrolled participants see the meeting under Q&A session schedules; other cohorts cannot see it.
### Galeri konten SIP

Resource news, program-bantuan, dan penyaluran-bantuan mendukung documentationPhotos opsional (maks. 50 foto berurutan). Setiap foto berisi id UUID unik, image URL HTTP(S) atau /uploads/sip/UUID.jpg|png|webp, caption opsional maks. 500 karakter, serta isDemo opsional. Field yang tidak dikirim saat update dipertahankan; array kosong menghapus galeri dari konten. Akses penulisan mengikuti editor SIP; galeri berita draft tidak dibuka endpoint publik. Terapkan migration 2026_11_11_000001_add_sip_content_galleries setelah backup database sebelum deploy frontend.

### Penggantian foto survei

DELETE dokumen Bantuan mengizinkan penggantian KTP, KK, SKTM, foto pendukung dan survey_* pada survey_assigned atau survey_cc_review, termasuk bukti survei yang pernah dikirim. Otorisasi tetap memeriksa penugasan serta pengunggah/Admin. Penghapusan menandai deleted_at dan mempertahankan file privat untuk audit. Setelah diteruskan ke persetujuan, bukti terkunci kembali. Kirim hasil pemeriksaan memvalidasi ulang kelengkapan foto aktif dan menandai bukti pengganti sebagai digunakan.

Ekspor lengkap Pengajuan Bantuan `GET /api/v1/bantuan/reports/full` diizinkan untuk
Superadmin, admin modul, dan Call Center (termasuk akun multi-role yang memiliki Call Center).
Role lain tidak memperoleh akses XLSX lengkap. Filter daftar dan scope data tetap diterapkan;
ekspor dicatat di jurnal, dibatasi 5/menit, dan respons memakai `no-store, private`.

LAZSIP: `DELETE /api/v1/lazsip/admin/transactions/{source}/{id}` menghapus catatan transaksi
uji setelah admin modul/Superadmin mengonfirmasi `testTransaction=true` serta `confirmationCode`
yang cocok dengan kode pelacakan (ID untuk legacy). Sumber: `payment`, `legacy-donation`, `zakat`.
Termasuk transaksi uji Production, tanpa panggilan pembatalan/refund ke provider. Pencocokan bank,
pembuatan sesi aktif, atau pengiriman receipt aktif ditolak 409. Receipt serta detail zakat yang
sudah tidak dipakai dibersihkan; donor, campaign, dan tombstone idempotensi tetap disimpan.
Target nominal campaign opsional: kosong/null/0 berarti tanpa target (disimpan sebagai 0).
Omission saat update mempertahankan target lama; nilai negatif/noninteger ditolak.

### Impor santunan Excel

`POST /api/v1/bantuan/santunan/imports`: admin/bendahara, maksimal 200 baris JSON
`{period, volunteerId, rows:[{recipientName, category, amount}]}` setelah Excel dibaca klien.
Kategori orphan/widow/foster_child/tahfidz/education/general; `rows[].frequency` opsional (default routine). Tidak rutin hanya orphan/tahfidz/education/general; status awal pending/process. Penyalur wajib aktif.
Transaksi atomik dan lock modul; nama (trim, case-insensitive), kategori, periode yang sama
ditolak 422 termasuk impor ulang. Respons 200 Resource `{data:{createdCount}}`,
no-store, private; throttle 10/menit. Baris invalid membatalkan seluruh impor.

Impor santunan menerima `rows[].verifierName`: nama pada daftar penyalur aktif,
trim/spasi berlebih dan kapital diabaikan. Harus cocok dengan tepat satu akun aktif
yang memiliki role volunteer. Tidak membuat akun baru atau mencocokkan nama sebagian.
Nama tidak dikenal/ambigu membatalkan seluruh impor (422) bila tanpa `rows[].verifierId`. UI memberi saran typo tanpa memilih otomatis; pengguna mengonfirmasi akun melalui verifierId. ID harus penyalur aktif, diperiksa kembali Laravel. Nama sumber dicatat terenkripsi pada audit. `volunteerId` tingkat atas
tetap diterima untuk klien lama; bila nama per baris dikirim, nama itu yang digunakan.
Template baru berisi Nama, Program, Nominal Bantuan, Nama Verifikator, dengan dropdown
nama dari daftar aktif. Data dummy unduhan menggunakan nama dari daftar yang sama.

### PDF materi Academy

POST `/api/v1/academy/admin/materials` dan PUT `/api/v1/academy/admin/materials/{id}`
menerima multipart `pdfFile` opsional (PDF maksimal 10 MiB) selain `file` audio
maksimal 50 MiB. Total kedua file maksimal 50 MiB. Nama ekstensi bukan satu-satunya
validasi: PDF diperiksa MIME dan header. Admin Academy saja; file tetap di storage
privat dan endpoint download memakai izin peserta serta jadwal rilis yang sama.
Materi hanya-PDF dapat dipublikasikan. PDF baru menambah lampiran; omission pada
edit mempertahankan PDF/audio lama. `file` tetap hanya menerima audio pada formulir
materi. Gagal menyimpan salah satu file membatalkan transaksi database dan membersihkan
file baru yang sempat tersimpan. Listing menambahkan `_count.pdfs` tanpa membuka URL
lampiran privat. Tidak memerlukan migration.

### Profil peserta Academy

GET `/api/v1/academy/profile` membutuhkan Sanctum dan akun aktif, lalu mengambil profil
berdasarkan user login saja. Query userId/profileId tidak dapat memilih akun lain.
Respons `{data:{name,code,email,nis,phone,address,gender,cohortName}}` hanya field yang diizinkan.
`cohortName` adalah nama angkatan yang ditetapkan pada profil sendiri, tanpa metadata
angkatan lain, hash password atau token. Header `no-store, private`.
Peserta yang wajib mengganti password awal tetap dapat membaca profil miliknya.
PUT `/api/v1/academy/profile` setelah ganti password awal menerima tepat `name`,
`phone`, `address` (wajib), serta `email` (opsional untuk klien lama; bila dikirim wajib terisi dan valid RFC, maksimal 191 karakter, di-trim dan dinormalisasi lowercase, unik tanpa membedakan kapital kecuali milik akun sendiri). Nama 2–100 karakter, alamat maksimal 2000 karakter;
nomor HP Indonesia dengan awalan 08/+628/628 dinormalisasi ke `^628[0-9]{7,12}$`.
Field lain ditolak 422, termasuk nomor akun/peserta, kelompok, angkatan,
userId/profileId dan password. Nama/email Core dan kontak profil Academy disimpan atomik
hanya untuk user login; kode, enrollment dan password tidak berubah. Respons profil
terbaru tetap `no-store, private`. Tidak memerlukan migration. Perubahan password
tetap memakai PUT `/api/v1/academy/profile/password` dengan password saat ini.

### Pengajuan lainnya (Bantuan)

`applicant.intakeType=other` memakai identitas pelapor (`name`, `nik` 16 digit,
`street`, `phone`, `reporterRelationship`), `otherCategory` (Proposal, Sedekah air bersih,
Renovasi rumah, Lainnya), `customTitle`, `problem`, `customBudget`, dan `applicationNotes`
opsional. Server menetapkan `source=online`, `program=Lainnya`; field demografi/survei
perorangan tidak diwajibkan. Draft tetap memerlukan nama dan NIK. Foto pendukung awal
opsional, beberapa file dengan caption. Berkas tetap privat dengan aturan upload gambar.

Alur: submit -> screening Call Center -> screen_pass -> review2 (penetapan nominal
Approver/Ketua) -> approved -> Call Center menentukan penyalur (verifier/volunteer) ->
fund_ready -> pengajuan dana -> fund_approved -> disburse -> disbursed -> handover -> completed.
Survei tidak berlaku. Transfer belum menyelesaikan pengajuan. Laporan dan bukti penyerahan
diisi penyalur yang ditugaskan, atau dicatat Call Center melalui manual-processes dengan
identitas pelaksana asli dan identitas pencatat terpisah. Jenis ini tidak dapat diganti setelah diproses.
Seluruh detail laporan disburse opsional untuk semua intake, termasuk other: tanggal,
nominal, account, bank, recipientName, recipientRelationship, dan bukti transfer.
Tanggal absen/null/kosong memakai hari ini; jika diisi harus tanggal valid tidak di masa depan.
Nominal absen/null/kosong memakai nominal disetujui; jika diisi harus integer positif
yang sama dengan nominal disetujui. Metadata penerima nullable string maksimal 191 karakter,
disimpan saat field dikirim. Bukti transfer baru yang tersedia tetap dikonsumsi.
Tanggal/nominal efektif tetap diaudit. Role, status, versi, dan bukti handover tetap berlaku. Data penerima disimpan terenkripsi dalam
manual_process.transferRecipient; dicatat oleh akun autentikasi pada audit. Tidak memerlukan
migration. Aksi `other_report` setelah completed menerima version dan handover.date/notes;
Call Center/Bendahara/admin dapat melengkapi laporan serta foto supporting kemudian tanpa
mengubah nominal, tanggal selesai, atau status. Hak akses lama tetap berlaku.


### Lampiran Bantuan

Seluruh slot dokumen pengajuan dan santunan menerima JPG/PNG/WEBP, PDF, DOC/DOCX,
XLS/XLSX, PPT/PPTX, ODT/ODS, TXT/CSV/RTF hingga **10 MiB per berkas**. HEIC/HEIF
foto dikonversi di browser; gambar dikompresi, dokumen tidak diubah. Validasi server
memeriksa ekstensi serta jenis isi berkas. Skrip/HTML dan ekstensi macro tidak diterima.
Hak akses, caption, antrean privat terenkripsi, audit, dan syarat jenis bukti tetap berlaku.
Unduh memakai MIME dan ekstensi yang sesuai: gambar/PDF inline, dokumen lainnya attachment.
Tidak ada viewer Office pihak ketiga; dokumen tidak dikirim ke layanan eksternal.

Deployment: pastikan migration `2026_11_09_000001_add_bantuan_photo_locations` telah
dijalankan; kolom photo_location yang belum ada menyebabkan DB_SCHEMA_MISMATCH saat
upload/detail. Backup sebelum migrate di VPS. Pastikan upload_max_filesize minimal 10M,
post_max_size dan client_max_body_size minimal 16M (jangan turunkan batas lebih besar yang
sudah dipakai Tanwir/Ojol). Reload PHP-FPM/Nginx bila konfigurasi berubah. HTTP 413 berarti
batas server/proxy masih terlalu kecil. Frontend kini menampilkan alasan/kode gagal per berkas.


Office attachments also require migration `2026_11_13_100000_expand_bantuan_attachment_mime`.
It widens mime from 40 to 255 characters in both Bantuan document tables. Word/Excel
OOXML MIME strings exceed 40 characters; MySQL otherwise rejects the insert with
SQLSTATE 22001 / driver 1406 (DATA_CONSTRAINT), even though SQLite tests allow it.
This additive widening preserves all existing files/data. Rollback deliberately does not
shrink the column, to avoid truncating already stored MIME values. Backup before VPS migration.


### Kelengkapan hasil survei Bantuan

Survei final (`survey_submit`, `survey_review_submit`, termasuk proses manual) wajib
mengisi `survey.sunnahKnowledge`: Ya, Tidak, atau Sudah mulai. Draft tetap boleh belum lengkap.
Validasi memakai gabungan data pemohon tersimpan dan koreksi yang dikirim: `dependents`
berupa daftar terstruktur tepat sejumlah `dependentCount` (0 memakai daftar kosong).
Setiap orang memerlukan nama, hubungan, jenis kelamin, umur, dan status sekolah/kerja.
Status tempat tinggal yang mengandung kontrak/sewa/rent memerlukan `rent` > 0 serta
`rentPeriod` bulan/tahun, termasuk saat pengajuan final. Harga sewa yang sudah ada tidak
hilang bila survei tidak mengirim koreksi. Data pemohon dan hasil verifikasi untuk Approver
menampilkan rincian ini. Tidak ada migration atau perubahan otomatis data selesai lama.


### Koreksi Bantuan dan profil Teknisi

Approver/Ketua dapat `revise_amount` hanya pada `approved`/`fund_ready`, sebelum pengajuan dana.
Alasan wajib, versi optimistis, larangan memutuskan pengajuan sendiri, dan audit nominal lama/baru berlaku.

`PUT bantuan/applications/{id}/admin-correction` khusus Superadmin/admin Bantuan, semua tahap.
Nomor pengajuan harus diketik ulang dan alasan koreksi wajib. Koreksi status/nominal tidak melakukan transfer.
Tanggal dan penyalur wajib sesuai tahap dana; dokumen tetap disimpan, termasuk saat diganti admin.
Grup dana aktif memerlukan persetujuan eksplisit pembatalan grup: seluruh anggota kembali `fund_ready`,
kemudian koreksi target diterapkan. Snapshot grup lama tidak diubah dan keputusan grup lama ditolak.
Koreksi data pemohon tetap melalui form Edit data. Semua koreksi dicatat beserta aktor dan data sebelum/sesudah.

`PUT teknisi/profile` hanya akun teknisi operasional aktif: nama, nomor HP, alamat sendiri.
Kode, peran, dan outlet tidak dapat diubah lewat endpoint ini. Password memakai Core `PUT auth/password`
di form inline Pengaturan akun Teknisi. Admin modul/Superadmin memakai reset Core tanpa password lama;
seluruh sesi target dicabut. Tidak ada password yang dikembalikan pada API profil.


### Galeri publik SARSIP

Konten `sarsip/entries` (campaign/kegiatan/berita) dan `sarsip/beneficiaries`
menerima `gallery` opsional, maksimal 12 item `{id, image, caption}`.
ID unik dalam satu galeri; image harus URL upload SARSIP lokal JPG/PNG/WebP,
caption nullable maksimal 500 karakter. `[]` mengosongkan galeri; field yang
absen pada update mempertahankan galeri lama. Upload memakai endpoint SARSIP
berizin yang sudah ada (maksimal 2 MiB per foto). Galeri ikut publik hanya untuk
konten published/completed atau penerima yang dipublikasikan dan tidak diarsip.
Telepon, lokasi, nama internal, dan catatan penerima tetap tidak disertakan.
Deployment memerlukan migration `2026_11_16_170000_add_sarsip_galleries`.


Riwayat NIK Bantuan pada `duplicate-check.applications` dan
`applications/{id}.duplicateApplications` tetap dibatasi scope akses akun.
Setiap ringkasan juga memuat createdByName/intakeRole/source, disbursedAt,
completedAt, handedOverAt, dan handedOverAmount (nullable). Tanggal/nominal
penyerahan diambil dari laporan handover, bukan tanggal pencairan atau nominal
persetujuan. Catatan dan isi lengkap handover tidak disertakan. Tidak ada migration.


Lampiran laporan penyerahan Bantuan memakai jenis `handover_supporting` pada
endpoint upload documents yang sudah ada. Opsional, dapat berisi beberapa berkas
(ID berbeda), dengan caption per berkas. Hanya penyalur yang ditugaskan/aktor
penyerahan berwenang, Call Center, atau admin sesuai scope dan tahap pencairan.
Bukti penyerahan serta sertifikat tetap wajib. Lampiran ikut tab Laporan penyerahan,
tersimpan terenkripsi, dan tidak menambah persyaratan penyelesaian. Tanpa migration.

### Fondasi Keuangan

GET `/api/v1/keuangan/overview`: Sanctum, user aktif, module.access:keuangan,
dan allowlist role `admin`, `finance_admin`, `treasurer`, `approver`, `operator`
(serta Core Superadmin). Registrasi awal nonaktif; preview Superadmin mengikuti
aturan Core. Resource berisi phase=foundation, readOnly=true, role/roleLabel,
permissions dan counts. Hitungan pengeluaran dalam modul, tugas waiting milik
akun sendiri, master hanya sesuai peran; hitungan terlarang null. Tidak ada
nominal, penerima, catatan, data akun lain, saldo atau kredensial. `no-store, private`.
Belum ada endpoint bisnis tulis/impor maupun posting Core finance.


### Pendamping laporan santunan

PUT `/api/v1/bantuan/santunan/{id}/companion`: admin/bendahara mengirim
`{version, companionId}` (null untuk mencabut). Target verifikator/penyalur aktif,
berbeda dari penyalur utama. Versi basi atau laporan selesai ditolak 409.
Pendamping hanya mendapat scope baca/download/unggah/complete santunan yang dipilih,
tetap memerlukan status transferred/process untuk laporan. Tidak boleh mencatat
transfer, mengubah penyalur utama, atau memilih pendamping lain. Uploader/completer
aktual dan pengubah pendamping dicatat. Pencabutan berlaku langsung, bukti tetap
tersimpan. Pendamping tidak disalin ke periode baru. Migration additive
`2026_11_17_000001_add_santunan_companion` diperlukan sebelum deploy kode baru.


### Jadwal beranda Academy

GET `/api/v1/academy/learning/today`: peserta aktif, password awal sudah diganti,
Academy aktif. Maksimal satu materi dan satu ujian dari angkatan/enrollment sendiri.
Mulai inklusif, berakhir eksklusif. Jika bertumpuk dipilih mulai terbaru lalu ID.
Materi memakai dashboardOpensAt/dashboardClosesAt manual, tanpa anchor atau batas 12.
Ujian memakai jadwal tersimpan, aktif, dipublikasikan dan otorisasi rilis yang sama.
Tidak menyertakan soal, jawaban, catatan atau URL file privat. no-store, private.
Riwayat pada menu Materi/Ujian tetap ada setelah masa tampil beranda berakhir.

POST/PUT admin materials menerima dashboardOpensAt/dashboardClosesAt (WIB,
YYYY-MM-DDTHH:mm). Keduanya diisi bersamaan, berakhir harus setelah mulai; null
keduanya menonaktifkan slot beranda. Field yang tidak dikirim dipertahankan pada edit.
Semua tanggal ujian diisi admin, durasi tetap timeLimitMinutes integer 1–1440.
Endpoint dashboard-schedule otomatis dihapus. Tidak ada penulisan ulang tanggal
ujian dari anchor cohort lama. Migration baru hanya menambah dua datetime nullable
pada zakat_academy_lessons, tanpa backfill atau perubahan data lama.


Daftar ujian peserta `/api/v1/academy/learning/quizzes` mengikuti urutan pembuatan
`created_at ASC, id ASC`, sama dengan daftar admin. Nomor harian/pekanan/akhir
mengikuti urutan tersebut per jenis. Desktop dan mobile mempertahankan urutan admin per jenis ujian,
tanpa mengurutkan ulang menurut tenggat atau status pengerjaan.


### Workflow Keuangan

`keuangan/expenses` GET/POST, GET/PUT `expenses/{id}`; `expense-options` GET;
`settings` GET; `masters/sources|categories` POST; `approval-rules` POST/PUT id;
`approvals` GET, GET id, POST `approvals/{id}/decisions`. Kontrak eksplisit pada
`tools/keuangan-contract.mjs`. RequestId UUID wajib untuk semua mutasi, per akun,
fingerprint operasi+payload, transaksi/lock row modul. Reuse berbeda atau versi
lama 409. Respon private/no-store, nominal string rupiah bulat; daftar 25 per halaman.

FinanceAccess mengikuti Core. Operator boleh input/revisi seluruh pengeluaran,
bukan mengelola master/approval. Admin Keuangan tidak memperoleh kelola akun Core.
Approval milik akun login saja, termasuk bagi admin. Penolakan menutup tugas lain
masih menunggu; jawaban lama sementara tidak bisa direvisi oleh approver lain.
Revisi penolakan membuka kembali yang ditutup karena penolakan saja. Revisi
pengeluaran membentuk round baru dengan snapshot aturan baru; audit lama append-only.
Nominal tanpa aturan tercatat unassigned, tidak pernah dianggap disetujui. Tidak
ada transaksi bank/ledger/iPaymu. Modul inactive tetap preview-only bagi Superadmin.
Migration workflow baru harus direview/backup sebelum deploy, bukan dijalankan saat build.

### Galeri LAZSIP dan tanggal berita

Galeri detail berita dan penyaluran LAZSIP memakai `documentationPhotos` (opsional,
maksimal 50 foto dengan id unik, image, caption maksimal 500 karakter, isDemo).
Admin dapat menambah, mengubah urutan/keterangan, dan menghapus referensi foto.
Field tidak dikirim mempertahankan galeri lama; [] mengosongkannya. Galeri berita
draft tetap privat. Foto penyaluran sengaja publik: jangan unggah KTP, rekening,
atau dokumen privat. Foto penyerahan/sertifikat yang lama tetap terpisah.
Deployment memerlukan migration `2026_11_17_140000_add_lazsip_news_beneficiary_galleries`;
backup database sebelum menjalankan migration lalu build/restart aplikasi.

Berita SIP dan LAZSIP menerima `newsDate` opsional (YYYY-MM-DD/null). Field ini
menentukan tanggal publik dan urutan berita sesudah prioritas pin; `createdAt`
tetap riwayat pembuatan. Field dihilangkan mempertahankan nilai; null kembali
ke tanggal pembuatan. Ini bukan penjadwalan publish, status tetap menentukan
visibilitas. Memerlukan migration `2026_11_17_150000_add_editorial_news_dates`.


Bantuan: koreksi tahap 1 pada PUT `/api/v1/bantuan/applications/{id}` di
`rejected_t1` dan `review1` diizinkan untuk Approver, Ketua, dan Approver Survei
yang bukan pembuat/verifikator pengajuan. Hak Admin/Call Center tetap berlaku.
Status tidak berubah saat edit; version dan audit sebelum/sesudah tetap wajib.
Aksi `reopen` dengan version dan alasan minimal 5 karakter mengembalikan
`rejected_t1` langsung ke `review1`, lalu keputusan mengikuti alur normal.
Approver Survei tidak boleh membuka penolakan tahap lain. Riwayat penolakan
serta dokumen tidak dihapus. Tidak ada migration baru.


Pesan error untuk pengguna memakai bahasa Indonesia yang menjelaskan kolom dan
langkah perbaikan. Validasi mengisi `error.details` dengan pesan per kolom dan
merangkum maksimal tiga pesan pada `error.message`. Nama field bersarang diberi
label dan nomor baris. Kode diagnosis dan request ID tetap berada pada metadata,
header dan log; jangan digabungkan ke pesan yang ditampilkan pada form. Payload
error tetap kompatibel. Client menerima pesan lama dengan menghapus suffix kode
teknis dan menerjemahkan validasi Laravel bila diperlukan.
