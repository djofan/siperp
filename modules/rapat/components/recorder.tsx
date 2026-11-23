'use client';
import { formatNumericText } from "@/lib/number-format";

import { useEffect, useRef, useState } from 'react';
import { request } from '../api/client';
import type { Viewer } from '@/contracts/modules/rapat';
import { useViewer } from './context';
import { clipStore, deliverClip, ownedClips, recordClips, type Clip } from './queue';
export default function Recorder({ meetingId, initialSequence, refresh, onPending, disabled = false }: { disabled?: boolean; meetingId: string; initialSequence: number; refresh: () => Promise<void>; onPending: (pending: boolean) => void }) {
  const ownerId = String(useViewer().id);
  const [clips, setClips] = useState<Clip[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const starting = useRef(false);
  const [message, setMessage] = useState('');
  const stop = useRef<(() => void) | null>(null);
  const sequence = useRef(initialSequence);
  const memory = useRef(new Map<string, Clip>());
  const lock = useRef(false);
  const mounted = useRef(true);
  async function reload() { const saved = await clipStore.forMeeting(ownerId, meetingId); const combined = new Map(ownedClips(saved, ownerId, meetingId).map(c => [c.clientId, c])); ownedClips([...memory.current.values()], ownerId, meetingId).forEach(c => combined.set(c.clientId, c)); const pending = [...combined.values()].sort((a,b) => a.sequence - b.sequence); sequence.current = Math.max(sequence.current, initialSequence, ...pending.map(c => c.sequence)); if (mounted.current) setClips(pending); }
  useEffect(() => { mounted.current = true; void reload().catch(() => setMessage('Penyimpanan perangkat tidak tersedia. Jangan tinggalkan halaman sebelum rekaman berhasil diunggah.')); return () => { mounted.current = false; stop.current?.(); }; }, [meetingId, ownerId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPending(recording || clips.length > 0 || busy || requesting || finalizing); }, [recording, clips.length, busy, requesting, finalizing, onPending]);
  async function send(clip: Clip) { const current = await request<Viewer>('viewer'); if (String(current.id) !== ownerId || clip.ownerId !== ownerId) throw new Error('Akun aktif berubah. Masuk kembali dengan akun pembuat rekaman untuk melanjutkan.'); if (clip.blob.size > 20 * 1024 * 1024 || clip.sequence > 500) throw new Error('Klip melebihi batas unggahan. Unduh salinannya untuk menyimpan rekaman.'); const data = new FormData(); data.set('file', clip.blob, clip.name); data.set('clientId', clip.clientId); data.set('sequence', String(clip.sequence)); await request(`meetings/${encodeURIComponent(meetingId)}/media`, { method: 'POST', body: data }); }
  async function flush() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { while (true) { const stored = await clipStore.forMeeting(ownerId, meetingId); const pending = new Map(ownedClips(stored, ownerId, meetingId).map(c => [c.clientId,c])); ownedClips([...memory.current.values()], ownerId, meetingId).forEach(c => pending.set(c.clientId,c)); if (!pending.size) break; for (const clip of [...pending.values()].sort((a,b) => a.sequence-b.sequence)) { await deliverClip(clip, ownerId, send); memory.current.delete(clip.clientId); } } await refresh(); setMessage('Rekaman telah diterima dan tersimpan.'); }
    catch (e) { setMessage(`${e instanceof Error ? e.message : 'Unggahan tertunda.'} Coba ulang atau unduh salinannya.`); }
    finally { lock.current = false; if (mounted.current) { setBusy(false); await reload().catch(() => setClips([...memory.current.values()])); } }
  }
  async function start() {
    if (starting.current) return;
    starting.current = true; setRequesting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Browser ini belum mendukung rekaman. Gunakan unggah berkas.');
      await reload();
      if (sequence.current >= 500) throw new Error('Batas 500 berkas tercapai. Buat rapat baru untuk melanjutkan rekaman.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      setRecording(true); setMessage('Mikrofon aktif. Tetap buka halaman ini; rekaman dapat terhenti saat perangkat terkunci.');
      stop.current = recordClips(stream, blob => {
        const n = ++sequence.current;
        const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const clip: Clip = { clientId: crypto.randomUUID(), ownerId, meetingId, sequence: n, blob, name: `rekaman-${n}.${ext}` };
        memory.current.set(clip.clientId, clip); if (mounted.current) setClips([...memory.current.values()]);
        if (n >= 500) { stop.current?.(); setRecording(false); setMessage('Batas berkas rapat tercapai. Simpan klip terakhir sebelum melanjutkan pada rapat baru.'); }
        void clipStore.put(clip).then(() => flush()).catch(() => { stop.current?.(); setRecording(false); setMessage('Penyimpanan perangkat gagal. Rekaman dihentikan; unduh salinan rekaman sekarang.'); });
      }, error => { setFinalizing(true); setRecording(false); setMessage(error); }, MediaRecorder, () => { if (mounted.current) { setRecording(false); setFinalizing(false); } });
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Izin mikrofon belum diberikan.'); } finally { starting.current = false; if (mounted.current) setRequesting(false); }
  }
  function download(clip: Clip) { const url = URL.createObjectURL(clip.blob); const a = document.createElement('a'); a.href = url; a.download = clip.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <section className="rp-card"><h2>Rekam percakapan</h2><p>Dengan menekan mulai, Anda mengizinkan penggunaan mikrofon. Pastikan peserta mengetahui perekaman ini.</p><div className="rp-actions">{recording ? <button type="button" disabled={finalizing} onClick={() => { setFinalizing(true); stop.current?.(); }}>■ Hentikan rekaman</button> : <button type="button" disabled={disabled || busy || requesting || finalizing} onClick={start}>● Mulai merekam</button>}<span>{finalizing ? 'Menyelesaikan klip terakhir…' : recording ? '● Sedang merekam' : 'Mikrofon tidak aktif'}</span></div><p className="rp-local-notice">Klip yang belum terkirim disimpan di browser ini sampai unggahan dikonfirmasi. Salinan lokal ini tidak terenkripsi; hindari merekam dari perangkat bersama. Pemulihan dan unggahan hanya tersedia untuk akun pembuat rekaman.</p><p role="status">{message}</p>{clips.length > 0 && <div><p>{formatNumericText(clips.length)} klip menunggu konfirmasi penyimpanan.</p><button type="button" disabled={disabled || busy || recording || finalizing} onClick={flush}>Coba unggah ulang</button>{clips.map(c => <div className="rp-row" key={c.clientId}><span>{c.name}</span><button type="button" onClick={() => download(c)}>Unduh salinan</button></div>)}</div>}</section>;
}
