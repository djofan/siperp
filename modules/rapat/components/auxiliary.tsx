'use client';
import { useCallback, useEffect, useState } from 'react';
import { AudioLines, Upload, Trash2, RefreshCw, Sparkles, Mic, FileText, Copy, Download, Check, LoaderCircle } from 'lucide-react';
import type { Meeting, Viewer } from '@/contracts/modules/rapat';
import { request } from '../api/client';
import Recorder from './recorder';
import { asError, ErrorNotice } from './feedback';

type Props = { meeting: Meeting; draft: Meeting; locked: boolean; busy: boolean; pending: boolean; dirty: boolean; onPending: (value: boolean) => void; onTranscript: (value: string) => void; refresh: () => Promise<Meeting>; run: (action: () => Promise<void>) => Promise<boolean>; onMeeting: (meeting: Meeting) => void };
export default function Auxiliary({ meeting, draft, locked, busy, pending, dirty, onPending, onTranscript, refresh, run, onMeeting }: Props) {
  const [source, setSource] = useState<'record' | 'upload'>('record');
  const [remove, setRemove] = useState<string | null>(null);
  const [ai, setAI] = useState<Viewer['ai'] | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [confirm, setConfirm] = useState<'transcribe' | 'minutes' | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const processing = meeting.status === 'processing';
  const hasText = Boolean(draft.transcript?.trim());
  const transcriberReady = ai?.transcriberReady ?? ai?.configured ?? false;
  const summarizerReady = ai?.summarizerReady ?? ai?.configured ?? false;
  const mutationsBlocked = locked || busy || pending || dirty;
  const checkAI = useCallback(async (signal?: AbortSignal) => {
    setChecking(true); setError(null);
    try { const value = await request<Viewer['ai']>('ai/status', { signal }); if (!signal?.aborted) setAI(value); }
    catch (e) { if (!signal?.aborted) setError(asError(e)); }
    finally { if (!signal?.aborted) setChecking(false); }
  }, []);
  useEffect(() => {
    if (locked) return;
    const controller = new AbortController();
    void request<Viewer['ai']>('ai/status', { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setAI(value); }).catch(e => { if (!controller.signal.aborted) setError(asError(e)); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [locked]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const invalid = selected.find(file => !file.size || file.size > 20 * 1024 * 1024 || !/\.(mp3|m4a|wav|webm|ogg|mp4|flac)$/i.test(file.name));
    if (invalid) throw new Error(`${invalid.name}: pilih berkas audio yang didukung, maksimal 20 MB per berkas.`);
    let sequence = Math.max(0, ...meeting.media.map(m => m.sequence));
    if (sequence + selected.length > 500) throw new Error('Maksimal 500 berkas audio per rapat.');
    let done = 0;
    setUploadProgress({ done, total: selected.length });
    try {
      for (const file of selected) {
        const data = new FormData(); data.set('file', file); data.set('clientId', crypto.randomUUID()); data.set('sequence', String(++sequence));
        await request(`meetings/${encodeURIComponent(meeting.id)}/media`, { method: 'POST', body: data });
        done++; setUploadProgress({ done, total: selected.length });
        await refresh();
      }
    } catch (e) { throw new Error(`${done} dari ${selected.length} berkas tersimpan. Unggah kembali hanya berkas yang belum masuk. ${asError(e).message}`); }
    finally { setUploadProgress(null); }
  }
  async function process(mode: 'transcribe' | 'minutes') {
    const result = await run(async () => {
      const next = await request<Meeting>(`meetings/${encodeURIComponent(meeting.id)}/${mode === 'transcribe' ? 'transcribe' : 'generate'}`, {
        method: 'POST', body: JSON.stringify({ version: meeting.version, ...(mode === 'minutes' ? { useTranscript: true } : {}) }),
      });
      onMeeting(next);
    });
    if (result) setConfirm(null);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(draft.transcript); setCopyNotice('Transkrip disalin.'); }
    catch { setCopyNotice('Teks belum dapat disalin. Gunakan Unduh TXT atau pilih teks secara manual.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([draft.transcript], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'transkrip-rapat.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const done = meeting.media.filter(m => m.transcribed).length;
  return <div className="rp-transcription-workspace">
    <ol className="rp-transcript-steps" aria-label="Langkah transkripsi">
      <li className={meeting.media.length ? 'complete' : 'active'}><span>{meeting.media.length ? <Check size={16}/> : '1'}</span><div><strong>Siapkan audio</strong><small>Rekam atau unggah berkas</small></div></li>
      <li className={processing ? 'active' : hasText ? 'complete' : ''}><span>{processing ? <LoaderCircle className="rp-spin" size={16}/> : hasText ? <Check size={16}/> : '2'}</span><div><strong>Buat transkrip</strong><small>Audio diubah menjadi teks</small></div></li>
      <li className={hasText && !processing ? 'active' : ''}><span>3</span><div><strong>Periksa hasil</strong><small>Koreksi, simpan, atau unduh</small></div></li>
    </ol>
    <ErrorNotice error={error}/>
    {meeting.status === 'failed' && <div className="rp-error" role="alert"><FileText size={20}/><div><strong>Proses belum selesai</strong><p>{meeting.error || 'Coba lagi setelah memeriksa kesiapan transkripsi.'}</p><p>Audio dan hasil yang sudah tersimpan tetap tersedia.</p></div></div>}
    <div className={`rp-audio-grid ${locked ? 'is-locked' : ''}`}>
    {!locked && <section className="rp-card rp-source-card">
      <div className="rp-section-head"><div><p className="rp-eyebrow">LANGKAH 1</p><h2>Tambahkan audio rapat</h2><p>Pilih rekaman langsung atau berkas yang sudah Anda miliki.</p></div></div>
      <div className="rp-source-switch" aria-label="Sumber audio">
        <button type="button" aria-pressed={source === 'record'} disabled={busy || pending} onClick={() => setSource('record')}><Mic size={17}/> Rekam langsung</button>
        <button type="button" aria-pressed={source === 'upload'} disabled={busy || pending} onClick={() => setSource('upload')}><Upload size={17}/> Unggah berkas</button>
      </div>
      <div className="rp-source-pane" hidden={source !== 'record'}><Recorder disabled={busy || dirty} meetingId={meeting.id} initialSequence={Math.max(0, ...meeting.media.map(m => m.sequence))} refresh={async () => { await refresh(); }} onPending={onPending}/></div>
      {source === 'upload' && <label className="rp-upload rp-audio-upload"><Upload size={27}/><strong>Pilih audio atau video rapat</strong><span>MP3, M4A, WAV, WEBM, OGG, MP4, FLAC · maksimal 20 MB per berkas</span><input aria-label="Pilih berkas audio rapat" type="file" multiple accept=".mp3,.m4a,.wav,.webm,.ogg,.mp4,.flac" disabled={mutationsBlocked} onChange={e => { const files = e.target.files; void run(() => upload(files)); e.target.value = ''; }}/></label>}
      {uploadProgress && <p role="status">Mengunggah {uploadProgress.done} dari {uploadProgress.total} berkas…</p>}
    </section>}
    <section className="rp-card">
      <div className="rp-section-head"><div><h2><AudioLines size={19}/> Audio tersimpan <span className="rp-count">{meeting.media.length}</span></h2><p>Putar sebentar untuk memastikan suara terdengar jelas.</p></div></div>
      {!meeting.media.length && <div className="rp-transcript-empty"><AudioLines size={30}/><strong>Belum ada audio</strong><p>Mulai merekam atau unggah berkas di atas. Audio harus selesai tersimpan sebelum dibuat transkrip.</p></div>}
      {meeting.media.map(media => <div className="rp-media" key={media.id}><div><strong>{media.sequence}. {media.name}</strong><small>{(media.size / 1024 / 1024).toFixed(1)} MB · {media.transcribed ? 'Teks sudah diproses' : 'Siap ditranskrip'}</small>
        {remove === media.id && <div className="rp-inline-confirm"><p>Hapus audio ini dari rapat? Transkrip yang sudah disimpan tetap ada.</p><button className="rp-danger-button" disabled={mutationsBlocked} onClick={() => void run(async () => { await request(`media/${encodeURIComponent(media.id)}`, { method: 'DELETE', body: JSON.stringify({ version: meeting.version }) }); await refresh(); setRemove(null); })}>Hapus audio</button><button disabled={busy} onClick={() => setRemove(null)}>Batal</button></div>}
      </div>{media.mime.startsWith('video/') ? <video controls preload="none" aria-label={`Putar ${media.name}`} src={`/api/rapat/media/${encodeURIComponent(media.id)}`}/> : <audio controls preload="none" aria-label={`Putar ${media.name}`} src={`/api/rapat/media/${encodeURIComponent(media.id)}`}/>}
        {!locked && <button className="rp-icon-button" disabled={mutationsBlocked} aria-label={`Hapus ${media.name}`} onClick={() => setRemove(media.id)}><Trash2 size={17}/></button>}
      </div>)}
      {!locked && <div className="rp-transcribe-action"><div><strong>Ubah audio menjadi teks</strong><p>Hasil transkrip dapat dikoreksi sebelum dijadikan notulen.</p><small>{checking ? 'Memeriksa mesin transkripsi…' : transcriberReady ? 'Mesin transkripsi siap' : 'Mesin transkripsi belum siap'}</small></div><div className="rp-actions"><button type="button" className="rp-primary" disabled={mutationsBlocked || checking || !transcriberReady || !meeting.media.length} onClick={() => hasText ? setConfirm('transcribe') : void process('transcribe')}><FileText size={17}/>{hasText ? 'Buat ulang transkrip' : 'Buat transkrip'}</button><button type="button" aria-label="Periksa kesiapan transkripsi" disabled={checking || busy} onClick={() => void checkAI()}><RefreshCw size={16}/></button></div></div>}
      {dirty && <p className="rp-warning">Simpan perubahan teks terlebih dahulu sebelum memproses audio atau membuat notulen.</p>}
      {pending && <p className="rp-warning" role="status">Selesaikan rekaman dan tunggu seluruh audio tersimpan sebelum memulai transkripsi.</p>}
      {confirm === 'transcribe' && <div className="rp-inline-confirm"><strong>Ganti transkrip yang sekarang?</strong><p>Audio akan diproses kembali. Koreksi pada transkrip akan diganti; isi notulen tetap dipertahankan.</p><button className="rp-primary" disabled={mutationsBlocked || !transcriberReady} onClick={() => void process('transcribe')}>Ya, buat ulang transkrip</button><button disabled={busy} onClick={() => setConfirm(null)}>Batal</button></div>}
      {processing && <div className="rp-transcript-progress" role="status"><LoaderCircle className="rp-spin" size={22}/><div><strong>{meeting.processingMode === 'transcribe' ? 'Sedang membuat transkrip…' : 'Sedang menyusun notulen…'}</strong><p>{meeting.processingMode === 'transcribe' ? `${done} dari ${meeting.media.length} berkas audio telah diproses. ` : ''}Proses berjalan di server. Anda boleh kembali ke daftar rapat dan membuka hasilnya nanti.</p></div></div>}
    </section>
    </div>
    <section className={`rp-card rp-transcript-result ${hasText ? '' : 'is-empty'}`}><div className="rp-section-head"><div><p className="rp-eyebrow">HASIL TRANSKRIP</p><h2>Periksa teks percakapan</h2><p>Periksa nama, angka, dan tanggal sambil mendengarkan audio.</p></div>{hasText && <div className="rp-actions"><button type="button" onClick={() => void copy()}><Copy size={16}/> Salin</button><button type="button" onClick={download}><Download size={16}/> Unduh TXT</button></div>}</div>
      <label className="rp-transcript-label">Teks transkrip<textarea aria-label="Teks transkrip" rows={hasText ? 14 : 5} maxLength={200000} disabled={locked || busy || pending} placeholder="Hasil transkrip akan muncul di sini setelah audio diproses. Anda juga dapat menempelkan transkrip yang sudah dimiliki." value={draft.transcript ?? ''} onChange={e => onTranscript(e.target.value)}/></label>
      <div className="rp-row rp-transcript-caption"><span>{hasText ? `${draft.transcript.length.toLocaleString('id-ID')} karakter${dirty ? ' · perubahan belum disimpan' : ' · tersimpan'}` : 'Belum ada hasil transkrip'}</span><span role="status">{copyNotice}</span></div>
      {meeting.segments?.length > 0 && <details className="rp-disclosure rp-segments"><summary>Lihat teks beserta waktu audio ({meeting.segments.length})</summary>{meeting.segments.map((segment, i) => <div className="rp-segment" key={i}><time>{Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')}</time><p>{segment.text}</p></div>)}</details>}
    </section>
    {!locked && <details className="rp-card rp-disclosure rp-ai-panel"><summary><Sparkles size={17}/> Langkah lanjutan: buat draf notulen</summary><p>Gunakan transkrip yang sudah diperiksa untuk menyusun ringkasan, keputusan, dan tugas.</p>
      {confirm === 'minutes' ? <div className="rp-inline-confirm"><p>Draf notulen yang tersimpan akan diganti hanya setelah proses berhasil. Teks transkrip tetap dipertahankan.</p><button className="rp-primary" disabled={mutationsBlocked || !summarizerReady || !hasText} onClick={() => void process('minutes')}>Ya, susun notulen</button><button disabled={busy} onClick={() => setConfirm(null)}>Batal</button></div> : <button type="button" disabled={mutationsBlocked || checking || !hasText || !summarizerReady} onClick={() => setConfirm('minutes')}><Sparkles size={16}/> Susun notulen dari transkrip</button>}
      <p className="rp-note">{!hasText ? 'Buat atau simpan transkrip terlebih dahulu.' : !summarizerReady ? 'Model notulen belum siap. Transkripsi audio tetap dapat digunakan.' : 'Periksa kembali seluruh hasil sebelum finalisasi.'}</p>
    </details>}
  </div>;
}
