# Konvensi REST API Siperp

Dokumen ini wajib menjadi acuan semua modul Laravel. Target adalah Richardson Maturity Level 2: URI mengidentifikasi resource, metode HTTP menyatakan operasi, dan status HTTP menyatakan hasil. HATEOAS penuh tidak diwajibkan. Kontrak v1 yang aktif ada pada `openapi.json`; `openapi.example.json` adalah kontrak demonstrasi khusus test dan tidak boleh dianggap endpoint production.

## Resource, routing, dan versioning

Reset password akun operasional: `POST /api/v1/core/module-accounts/{id}/password-reset`
memerlukan akun aktif dan otorisasi admin. Admin modul hanya boleh mereset akun operasional
yang seluruh akses modulnya berada dalam cakupan pengelolaannya; Superadmin boleh lintas modul.
Akun admin, Superadmin, akun sendiri, dan akun tanpa akses operasional ditolak. Request berisi
`password` dan `password_confirmation` (12–72 karakter), tanpa password lama. Respons tidak
mengandung password; server menyimpan hash, mencabut seluruh token target, dan mencatat aktor
serta target tanpa kredensial. Batas 10 permintaan/menit; header respons `no-store, private`.
Daftar akun menyediakan `canResetPassword` untuk UI, tetapi endpoint tetap mengotorisasi ulang.

### Diagnosis error untuk pengelola

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
`foster_child`, dan `tahfidz` (Lembaga Tahfidz). Tidak rutin tetap hanya `orphan`.
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

### Galeri konten SIP

Resource news, program-bantuan, dan penyaluran-bantuan mendukung documentationPhotos opsional (maks. 50 foto berurutan). Setiap foto berisi id UUID unik, image URL HTTP(S) atau /uploads/sip/UUID.jpg|png|webp, caption opsional maks. 500 karakter, serta isDemo opsional. Field yang tidak dikirim saat update dipertahankan; array kosong menghapus galeri dari konten. Akses penulisan mengikuti editor SIP; galeri berita draft tidak dibuka endpoint publik. Terapkan migration 2026_11_11_000001_add_sip_content_galleries setelah backup database sebelum deploy frontend.

### Penggantian foto survei

DELETE dokumen Bantuan mengizinkan penggantian KTP, KK, SKTM, foto pendukung dan survey_* pada survey_assigned atau survey_cc_review, termasuk bukti survei yang pernah dikirim. Otorisasi tetap memeriksa penugasan serta pengunggah/Admin. Penghapusan menandai deleted_at dan mempertahankan file privat untuk audit. Setelah diteruskan ke persetujuan, bukti terkunci kembali. Kirim hasil pemeriksaan memvalidasi ulang kelengkapan foto aktif dan menandai bukti pengganti sebagai digunakan.
