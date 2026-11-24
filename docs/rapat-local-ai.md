> Pembaruan 24 November 2026: workspace Rapat hanya memakai rekaman dan transkrip
> Whisper small int8. Fitur/model notulen dihentikan, readiness tidak menghubungi
> Ollama. Bagian penyusun notulen di bawah adalah catatan konfigurasi historis;
> tidak perlu memasang atau mengaktifkannya. Data lama tetap disimpan.

# Runtime AI Rapat lokal gratis

Python 3.10+, faster-whisper CPU int8 (tanpa Torch), PyAV untuk membaca konten
audio tanpa bergantung ekstensi, dan Ollama lokal. Tidak ada API berbayar atau
fallback cloud. Runtime tidak pernah mengunduh model. Setup terpisah membutuhkan
internet hanya untuk dependensi PyPI dan model publik Hugging Face.

## Instalasi eksplisit (PowerShell, dari root repositori)

```powershell
& 'D:/laragon/bin/python/python-3.10/python.exe' -m venv .tmp-uat/rapat-ai-venv
& '.tmp-uat/rapat-ai-venv/Scripts/python.exe' -m pip install --index-url https://pypi.org/simple -r tools/rapat/requirements.txt
$env:RAPAT_MODEL_DIR = Join-Path (Get-Location) '.tmp-uat/rapat-models'
& '.tmp-uat/rapat-ai-venv/Scripts/python.exe' tools/rapat/setup.py download-model
```

Setup mengambil `config.json`, `tokenizer.json`, `model.bin`, serta file yang ada
di repo dari `preprocessor_config.json`, `vocabulary.json`, dan `vocabulary.txt`.
Default transkripsi adalah Whisper `small` multilingual dari
`Systran/faster-whisper-small`, CPU `int8`, dua thread dan satu worker per proses.
Pilihan ini mengurangi beban dibanding large-v3 untuk server dengan kapasitas
terbatas. Dua thread bukan jaminan kapasitas VPS mencukupi; ukur RAM tersedia,
swap, durasi proses, dan respons web pada server target. Batasi antrean agar hanya
satu transkripsi berjalan sekaligus; `num_workers=1` tidak membatasi jumlah proses
Laravel yang dapat berjalan bersamaan. Model small tetap memerlukan pemeriksaan
manusia, terutama nama, angka, dan istilah Arab.

`RAPAT_WHISPER_MODEL` yang diisi eksplisit tetap mengalahkan default. Model
`base`, `large-v3`, dan `large-v3-turbo` tetap didukung tanpa fallback otomatis.
Turbo memakai repo kanonis `dropbox-dash/faster-whisper-large-v3-turbo`.
Kesiapan membutuhkan file inti dan salah satu vocabulary JSON/TXT yang tidak
kosong; large-v3 penuh dan turbo juga memerlukan `preprocessor_config.json`.
Setup mengunduh model yang dipilih secara eksplisit, sedangkan runtime tetap
lokal/offline dan tidak mengunduh model. PyAV dipatok ke 16.1.0 yang diuji dengan
faster-whisper 1.2.1; PyAV 19 menghapus argumen decoder yang masih dipakai versi ini.
Venv, model, rekaman, dan hasil eksperimen adalah artefak lokal `.tmp-uat/`;
jangan commit atau publikasikan direktori ini.

Jika instalasi lama memakai `RAPAT_WHISPER_MODEL=large-v3`, ubah menjadi `small`
dan unduh checkpoint small dengan setup sebelum memuat ulang konfigurasi Laravel
serta worker pada saat deployment yang diizinkan. Mengganti default kode tidak
menimpa environment eksplisit atau menyediakan model di VPS. Transkrip tersimpan
tetap dipertahankan; pemrosesan ulang menggunakan revisi cache sesuai model aktif.

Ollama portable dipasang terpisah. Jalankan server lokal kemudian unduh sekali
secara eksplisit dengan `ollama pull qwen3.5:9b`. Jangan gunakan model cloud.

## Konfigurasi proses

Panduan worker systemd dan profil VPS berkapasitas terbatas berada di
[ops/rapat/README.md](../ops/rapat/README.md). Profil tersebut memakai override
`RAPAT_OLLAMA_MODEL=qwen3.5:0.8b-q8_0`; default model notulen dalam kode tetap
`qwen3.5:9b`. Environment VPS dan checkpoint tidak masuk repositori.

Laravel membaca `RAPAT_PYTHON` sebagai lokasi executable Python venv. Isi juga
`RAPAT_MODEL_DIR`, `RAPAT_WHISPER_MODEL`, `RAPAT_OLLAMA_URL`, dan
`RAPAT_OLLAMA_MODEL` pada environment backend. Gunakan path absolut milik server;
path Windows development tidak berlaku di VPS Linux. Config Laravel meneruskan
variabel tersebut ke proses Python. Restart worker setelah mengganti konfigurasi.

Contoh konfigurasi Linux (sesuaikan lokasi instalasi):

```dotenv
RAPAT_PYTHON=/opt/rapat/venv/bin/python
RAPAT_MODEL_DIR=/opt/rapat/models
RAPAT_WHISPER_MODEL=small
RAPAT_OLLAMA_URL=http://127.0.0.1:11434
RAPAT_OLLAMA_MODEL=qwen3.5:9b
```

Model dan worker dipasang pada mesin server yang melayani web. Pengguna lain
cukup memakai browser melalui HTTPS dan akun Core berakses Rapat. Perekaman
mikrofon memerlukan HTTPS, kecuali localhost saat development. Di HP, menutup
tab, mengunci layar, atau interupsi sistem dapat menghentikan perekaman; periksa
klip yang tersimpan dan lanjutkan secara manual. Ini bukan perekam background.

| Variabel | Default / fungsi |
| --- | --- |
| `RAPAT_WHISPER_MODEL` | `small`; environment eksplisit mengalahkan default; model lain opsional |
| `RAPAT_MODEL_DIR` | `~/.cache/rapat-models`; folder berisi subfolder sesuai nama model |
| `RAPAT_AUDIO_ROOTS` | direktori temp OS; daftar root privat absolut, dipisahkan `;` pada Windows / `:` pada Linux |
| `RAPAT_OLLAMA_URL` | `http://127.0.0.1:11434`; hanya IP loopback atau localhost, tanpa kredensial, path, query, redirect, proxy environment |
| `RAPAT_OLLAMA_MODEL` | `qwen3.5:9b`; harus sudah ada secara lokal |
| `RAPAT_TIMEOUT_SECONDS` | 900; batas keras proses 5–3600 detik |

Set root audio ke folder privat khusus upload sementara Laravel. Jangan gunakan
root repositori atau folder publik. Laravel harus memvalidasi upload, membuat
tempfile privat yang tidak dapat diganti pihak lain selama proses, lalu menghapus
file setelah selesai. Engine menolak path relatif, file hilang/kosong, direktori,
symlink, file di luar root yang telah di-resolve, serta ukuran di atas 20 MiB.
Metadata filename tambahan diabaikan; konten media dibaca PyAV.

## Protokol CLI dan Symfony Process

Satu proses untuk satu JSON object stdin (EOF wajib), satu JSON stdout, exit 0
untuk sukses / 1 untuk gagal. Tidak ada log transkrip atau detail exception ke
stderr. Command bisa argumen CLI atau properti `command` pada JSON stdin.

```powershell
'{}' | & '.tmp-uat/rapat-ai-venv/Scripts/python.exe' tools/rapat/engine.py health
'{"transcript":"Rapat membahas laporan bulanan.","meeting":{"title":"Evaluasi","agenda":[],"participants":[]}}' | & '.tmp-uat/rapat-ai-venv/Scripts/python.exe' tools/rapat/engine.py minutes
```

Contoh integrasi untuk pemanggil (tidak mengubah backend):

```php
$process = new Symfony\Component\Process\Process([
    $pythonAbsolutePath, $engineAbsolutePath, 'transcribe',
], base_path('..'), [
    'RAPAT_MODEL_DIR' => $modelCacheAbsolutePath,
    'RAPAT_AUDIO_ROOTS' => $privateTempDirectory,
]);
$process->setInput(json_encode(['file' => $privateAbsoluteFile, 'language' => 'id'], JSON_THROW_ON_ERROR));
$process->setTimeout(930);
$process->run();
$result = json_decode($process->getOutput(), true, 512, JSON_THROW_ON_ERROR);
// Periksa exit code dan error sebelum menggunakan hasil.
```

`health` menghasilkan `{transcriberReady:boolean,summarizerReady:boolean,provider:"local"}`.
Pemeriksaan hanya melihat dependensi/cache dan GET loopback `/api/tags`; tidak
memuat Whisper, menghasilkan teks, atau mengunduh. Kesiapan ini bukan jaminan
RAM/decoder/inferensi berhasil; uji transcribe tetap diperlukan.

`transcribe` menerima `{file:"absolute private tempfile",language:"id"}` dan
menghasilkan `{text,segments:[{start,end,text,speaker:null}]}`; waktu dalam detik,
tanpa diarization atau identifikasi pembicara.

Decoder tetap `language='id'` untuk bahasa dominan Indonesia dengan istilah Inggris,
`task='transcribe'` (tidak menerjemahkan), CPU int8, dua thread, satu worker, beam 5, `temperature=0`, VAD,
`condition_on_previous_text=False`, `word_timestamps=True`, dan
`hallucination_silence_threshold=2`. Word timestamp dipakai decoder untuk kontrol
halusinasi pada jeda; kontrak segmen tetap waktu tingkat segmen.
Tidak ada penghapusan kustom kalimat berulang atau ucapan dengan keyakinan rendah.
Kontrol VAD/jeda decoder dapat memengaruhi ucapan di sekitar keheningan; bandingkan
dengan audio sumber. Bila hasil kosong atau hanya tanda baca, engine mengembalikan
error `no_usable_speech`, bukan meneruskan teks kosong ke pembuatan notulen.

Respons transkripsi juga menambahkan `stats` dan `warnings`:
`segmentCount`, `avgLogprob`, `avgNoSpeechProbability`, `avgWordProbability`, serta
`lowConfidenceSegmentIndexes` (indeks mulai 0). Rata-rata tingkat segmen tidak
dibobot durasi; rata-rata probabilitas kata memakai semua kata yang tersedia.
Statistik yang tidak tersedia menjadi null. Segmen dengan logprob < -1 atau
probabilitas no-speech > 0.6 ditandai `low_confidence_speech` tanpa menghapus teks.
Ini indikator decoder, bukan skor akurasi terkalibrasi; warning kosong juga bukan
jaminan kebenaran. Uji audio Indonesia/Inggris nyata tetap diperlukan pada server target.
Upgrade tidak mengunduh ulang model secara otomatis; pengelola mengunduh model dan
mengubah environment Laravel/worker ke `small` sebelum pengujian nyata.
Fixture Windows Zira/SAPI dengan pengucapan Indonesia yang kurang tepat hanya
smoke test eksekusi, bukan benchmark akurasi. Validasi akurasi menunggu audio asli
beserta pemeriksaan manual terhadap ucapan sumber. Statistik decoder tidak dapat
membuktikan tidak adanya halusinasi atau pengulangan.

Default summarizer adalah `qwen3.5:9b`, pilihan untuk Ryzen 7530U dengan
RAM 16 GB dan iGPU. Ukuran unduhan model sekitar 6,6 GB bukan
total kebutuhan RAM: konteks, cache, OS, aplikasi lain, dan iGPU memakai RAM juga.
Ini pilihan yang mengutamakan kemampuan model, bukan jaminan model terbaik atau
pasti muat/cepat. Ukur pemakaian RAM dan latensi pada server target setelah pemasangan.
Inferensi menggunakan konteks 8192, `think=false` untuk jawaban JSON langsung,
dan `keep_alive=0` agar model dilepas setelah setiap request. Ini mengurangi
model menetap di RAM tetapi menambah biaya pemuatan pada map/reduce. Hindari
menjalankan Whisper dan Ollama paralel; pemanggil perlu membatasi konkurensi.
CPU/iGPU aktual yang dipakai tergantung runtime Ollama; engine tidak menjamin
akselerasi iGPU. Pilihan model eksplisit melalui environment tetap didukung,
termasuk `qwen2.5:1.5b` untuk perbandingan. Tidak ada fallback model atau layanan
berbayar otomatis. Model lebih besar tetap dapat mengarang fakta.

`minutes` menerima `{transcript,meeting:{title,agenda,participants,...}}` dan
menghasilkan `{summary,discussion:[],decisions:[],actions:[{task,assignee,dueDate,status:"open"}]}`.
Assignee tidak diketahui menjadi null; dueDate hanya tanggal ISO eksplisit yang
valid dalam transkrip, selainnya null. Tipe salah mendapat default aman; JSON
rusak/terpotong ditolak. Tidak ada notulen palsu saat model hilang.

Transkrip maksimal 200.000 karakter, metadata maksimal 4.000 karakter, stdin
maksimal 1.200.000 byte. Di atas 12.000 karakter diproses map dan reduksi berpasangan
dengan konteks 8192 token. Intermediate di atas anggaran ditolak
(`reduction_too_large`), bukan dipotong diam-diam. Waktu HTTP connect 3 detik,
health read 3 detik, generate read 180 detik; deadline proses membatasi seluruh
rangkaian. Bahasa tanpa spasi/token padat masih dapat melampaui konteks: respons
terpotong ditolak.

Prompt sistem memperlakukan transkrip dan metadata sebagai data tidak tepercaya,
meminta notulen formal Indonesia berdasarkan fakta eksplisit tanpa mengarang PIC,
tanggal atau keputusan. Pemeriksaan struktur dan keberadaan literal PIC/tanggal
tidak membuktikan kebenaran semantik hasil LLM: notulen tetap perlu diperiksa
terhadap sumber, terutama bila menggunakan model kecil.

Metadata `meeting` tetap diterima dan divalidasi, tetapi tidak dikirim ke model:
agenda, judul, dan daftar peserta tidak boleh menjadi sumber fakta notulen.
Prompt meminta daftar kosong bila transkrip hanya menyebut topik tanpa rincian.
Bila ketiga bagian faktual kosong, validator memakai ringkasan ketidakcukupan
informasi yang tetap, bukan narasi model. Ini default aman, bukan fallback saat
Ollama/model tidak tersedia. Regresi integrasi juga mencakup transkrip SAPI pendek
dengan agenda yang tidak didukung sumber.

Kesalahan menghasilkan `{"error":{"code":"...","message":"..."}}`, tanpa path
privat atau transkrip. Tidak ada ekstraksi heuristik sebagai pengganti model.

## Pengujian offline

```powershell
& '.tmp-uat/rapat-ai-venv/Scripts/python.exe' -m unittest discover -s tools/rapat -v
& '.tmp-uat/rapat-ai-venv/Scripts/python.exe' -m pip check
```

Unit test memakai model dan respons Ollama palsu, tanpa jaringan eksternal.
Uji regresi integrasi opsional dengan Ollama aktif:

```powershell
& '.tmp-uat/rapat-ai-venv/Scripts/python.exe' tools/rapat/check_local_minutes.py
```

Uji ini menggunakan teks sintetis evaluasi layanan, memeriksa satu keputusan
pembaruan daftar bantuan, dua tugas Amru/Yono, tenggat Amru `2026-11-23`, dan
tenggat Yono null. Prompt membedakan keputusan kolektif dari penugasan serta
meminta ringkasan hasil yang singkat; tidak memakai fallback ekstraktif.

Referensi implementasi: [faster-whisper](https://github.com/SYSTRAN/faster-whisper),
[model Systran small](https://huggingface.co/Systran/faster-whisper-small), dan
[Ollama generate](https://docs.ollama.com/api/generate).

## Alur transkripsi terlebih dahulu

Workspace membuka tab Transkrip secara default. Buat rapat dengan judul dan tanggal,
rekam atau unggah audio, lalu pilih Buat transkrip. Hasil dapat dikoreksi, disimpan,
disalin dan diunduh TXT. Notulen disusun secara terpisah dari transkrip tersimpan;
model notulen yang tidak siap tidak menghalangi transkripsi. Proses gagal tetap
menyimpan audio dan bagian transkrip yang sudah berhasil. Konfirmasi diperlukan
sebelum mengganti transkrip atau notulen yang sudah ada.

Deploy memerlukan pembaruan helper worker melalui `ops/rapat/install-worker.sh`
setelah rilis baru aktif, agar antrean `rapat-transcription` didengarkan. Ikuti
panduan ops dan lakukan smoke test per pengguna; web update tidak memasang helper
global secara otomatis. Tidak ada migration atau penghapusan data lama.

Tes backend opsional dengan audio/model nyata memakai variabel proses
`RAPAT_REAL_ASR_SAMPLE` (WAV lokal), `RAPAT_REAL_ASR_PYTHON` (venv) dan
`RAPAT_REAL_ASR_MODELS` (root cache berisi small), lalu jalankan RapatTest dengan
phpunit.xml. Tes tetap memakai SQLite dalam memori dan storage test. Audio/model
tidak dibundel atau di-commit; tanpa ketiga variabel, hanya tes nyata ini dilewati.
