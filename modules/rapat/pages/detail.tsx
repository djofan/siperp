"use client";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save, UsersRound, AudioLines, Archive, RotateCcw, CalendarDays, LockKeyhole, X } from 'lucide-react';
import type { Meeting } from '@/contracts/modules/rapat';
import { request } from '../api/client';
import { canEdit, statusLabel } from '../api/policy';
import { dateLabel, metadataIssues } from '../api/workflow';
import { useViewer } from '../components/context';
import Metadata from '../components/metadata';
import Auxiliary from '../components/auxiliary';
import { asError, ErrorNotice, Loading, Success } from '../components/feedback';
import { useUnsavedGuard } from '../components/unsaved';

const tabs = [{ id: 'audio', label: 'Transkrip', icon: AudioLines }, { id: 'informasi', label: 'Informasi & peserta', icon: UsersRound }];
export default function Detail() {
  const { id } = useParams<{ id: string }>(); const viewer = useViewer();
  return <MeetingWorkspace key={`${viewer.id}:${id}`} id={id}/>;
}
function MeetingWorkspace({ id }: { id: string }) {
  const viewer = useViewer();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [draft, setDraft] = useState<Meeting | null>(null);
  const [tab, setTab] = useState('audio');
  const [dirty, setDirty] = useState(false); const dirtyRef = useRef(false);
  const [busy, setBusy] = useState(false); const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null); const [notice, setNotice] = useState('');
  const [pollingPaused, setPollingPaused] = useState(false); const [confirmArchive, setConfirmArchive] = useState(false);
  const endpoint = `meetings/${encodeURIComponent(id)}`;
  const refresh = useCallback(async () => {
    const next = await request<Meeting>(endpoint); setMeeting(next);
    if (!dirtyRef.current) setDraft(next);
    return next;
  }, [endpoint]);
  useEffect(() => {
    const controller = new AbortController();
    void request<Meeting>(endpoint, { signal: controller.signal }).then(next => {
      if (!controller.signal.aborted) { setMeeting(next); setDraft(next); }
    }).catch(e => { if (!controller.signal.aborted) setError(e); });
    return () => controller.abort();
  }, [endpoint]);
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get('tab');
    if (selected && tabs.some(t => t.id === selected)) requestAnimationFrame(() => setTab(selected));
  }, []);
  useEffect(() => {
    if (meeting?.status !== 'processing' || pollingPaused) return;
    const timer = setTimeout(() => { void refresh().catch(e => { setError(e); setPollingPaused(true); }); }, 3000);
    return () => clearTimeout(timer);
  }, [meeting, refresh, pollingPaused]);
  useUnsavedGuard(dirty || pending || busy);
  function edit(next: Meeting) { dirtyRef.current = true; setDirty(true); setDraft(next); setNotice(''); }
  function adopt(next: Meeting) { dirtyRef.current = false; setDirty(false); setMeeting(next); setDraft(next); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null); setNotice('');
    try { await action(); return true; } catch (e) { setError(asError(e)); return false; } finally { setBusy(false); }
  }
  if (!meeting || !draft) return <><Link className="rp-back" href="/admin/rapat"><ArrowLeft size={15}/> Semua rapat</Link><ErrorNotice error={error}/>{!error && <Loading text="Membuka transkrip rapat…"/>}</>;
  const editable = canEdit(viewer, meeting); const processing = meeting.status === 'processing';
  const locked = !editable || !!meeting.archivedAt || processing;
  async function save() {
    if (!draft || !meeting) return;
    const issues = metadataIssues(draft); if (issues.length) throw new Error(issues.join(' '));
    const { title, meetingDate, startTime, endTime, location, agenda, chair, notetaker, participants, transcript } = draft;
    const next = await request<Meeting>(endpoint, { method: 'PUT', body: JSON.stringify({ version: meeting.version, title, meetingDate, startTime, endTime, location, agenda, chair, notetaker, participants, ...(transcript !== meeting.transcript ? { transcript } : {}) }) });
    adopt(next); setNotice('Perubahan tersimpan.');
  }
  return <>
    <Link className="rp-back" href="/admin/rapat"><ArrowLeft size={15}/> Semua rapat</Link>
    <div className="rp-heading rp-detail-heading"><div><span className="rp-badge">{statusLabel[meeting.status]}</span>{meeting.archivedAt && <span className="rp-badge"><Archive size={12}/> Diarsipkan</span>}<h1>{meeting.title}</h1><div className="rp-detail-dates"><span><CalendarDays size={14}/> Tanggal rapat: {dateLabel(meeting.meetingDate)}</span>{meeting.location && <span>{meeting.location}</span>}{meeting.participants.length > 0 && <span>{meeting.participants.length} peserta</span>}</div></div></div>
    <div className="rp-record-meta"><span>Dicatat {dateLabel(meeting.createdAt, true)}</span><span>Diperbarui {dateLabel(meeting.updatedAt, true)}</span></div>
    <ErrorNotice error={error}/>{notice && <Success>{notice}</Success>}
    {processing && pollingPaused && <div className="rp-warning" role="status">Transkripsi berjalan di server. Pembaruan tampilan terhenti.<button onClick={() => { setPollingPaused(false); void run(async () => { await refresh(); }); }}>Periksa kembali</button></div>}
    {!editable && <p className="rp-note"><LockKeyhole size={14}/> Mode baca saja. Perubahan hanya tersedia bagi pengelola rapat ini.</p>}
    {confirmArchive && <section className="rp-card rp-confirm-panel" aria-label="Konfirmasi arsip"><div className="rp-section-head"><h2>{meeting.archivedAt ? 'Kembalikan rapat ke daftar aktif?' : 'Arsipkan rapat ini?'}</h2><button className="rp-icon-button" disabled={busy} aria-label="Tutup konfirmasi" onClick={() => setConfirmArchive(false)}><X size={17}/></button></div><p>Rekaman dan transkrip tetap tersimpan.</p>{dirty && <p className="rp-warning">Simpan perubahan terlebih dahulu.</p>}<div className="rp-actions"><button className="rp-primary" disabled={busy || pending || dirty} onClick={() => void run(async () => { const next = await request<Meeting>(`${endpoint}/archive`, { method: 'POST', body: JSON.stringify({ version: meeting.version, archived: !meeting.archivedAt }) }); adopt(next); setConfirmArchive(false); setNotice(meeting.archivedAt ? 'Rapat dikembalikan ke daftar aktif.' : 'Rapat diarsipkan.'); })}>{meeting.archivedAt ? 'Ya, kembalikan rapat' : 'Ya, arsipkan rapat'}</button><button disabled={busy} onClick={() => setConfirmArchive(false)}>Batal</button></div></section>}
    <div className="rp-tabs" role="tablist" aria-label="Bagian catatan rapat">{tabs.map(({ id: section, label, icon: Icon }) => <button key={section} type="button" role="tab" id={`tab-${section}`} aria-selected={tab === section} tabIndex={tab === section ? 0 : -1} aria-controls={`panel-${section}`} disabled={pending} onClick={() => setTab(section)} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = tabs.find(t => t.id !== section)!.id; setTab(next); document.getElementById(`tab-${next}`)?.focus(); } }}><Icon size={15}/>{label}</button>)}</div>
    <form id="rp-edit-form" noValidate onSubmit={e => { e.preventDefault(); void run(save); }}><section id="panel-informasi" role="tabpanel" aria-labelledby="tab-informasi" hidden={tab !== 'informasi'} className="rp-card rp-editor-card"><div className="rp-section-head"><div><h2>Informasi & peserta</h2><p>Semua isian opsional. Anda dapat langsung merekam atau membuat transkrip tanpa melengkapinya.</p></div></div><Metadata value={draft} disabled={locked || busy} onChange={value => edit({ ...draft, ...value })}/></section></form>
    <section id="panel-audio" role="tabpanel" aria-labelledby="tab-audio" hidden={tab !== 'audio'}>{tab === 'audio' && <Auxiliary meeting={meeting} draft={draft} locked={locked} busy={busy} pending={pending} dirty={dirty} onPending={setPending} onTranscript={transcript => edit({ ...draft, transcript })} refresh={refresh} run={run} onMeeting={next => { adopt(next); setPollingPaused(false); }}/>}</section>
    {editable && !locked && (dirty || tab !== 'audio') && <div className="rp-savebar"><div><strong className={dirty ? 'rp-unsaved' : ''}>{busy ? 'Menyimpan…' : dirty ? 'Ada perubahan belum disimpan' : 'Semua perubahan tersimpan'}</strong><small>{pending ? 'Tunggu rekaman selesai dan unggahan dikonfirmasi.' : 'Simpan perubahan sebelum meninggalkan halaman.'}</small></div><button className="rp-primary" disabled={busy || !dirty || pending} type="submit" form="rp-edit-form"><Save size={16}/>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>}
    <footer className="rp-detail-footer"><span>Transkrip rapat privat · Akses mengikuti akun Anda</span>{editable && <button type="button" disabled={busy || processing || pending} onClick={() => setConfirmArchive(true)}>{meeting.archivedAt ? <RotateCcw size={14}/> : <Archive size={14}/>} {meeting.archivedAt ? 'Kembalikan dari arsip' : 'Arsipkan rapat'}</button>}</footer>
  </>;
}
