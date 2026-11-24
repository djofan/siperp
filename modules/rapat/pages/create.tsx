'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Mic } from 'lucide-react';
import type { Meeting, MeetingInput } from '@/contracts/modules/rapat';
import { useViewer } from '../components/context';
import Metadata from '../components/metadata';
import { canCreate } from '../api/policy';
import { localDate, metadataIssues } from '../api/workflow';
import { request } from '../api/client';
import { ErrorNotice, asError } from '../components/feedback';
import { useUnsavedGuard } from '../components/unsaved';

export default function Create() {
  const viewer = useViewer(); const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [value, setValue] = useState<MeetingInput>({ title: '', meetingDate: localDate(), startTime: '', endTime: '', location: '', agenda: '', chair: '', notetaker: viewer.name, template: 'dinas', participants: [], institution: viewer.institution });
  useUnsavedGuard(dirty || busy);
  if (!canCreate(viewer)) return <section className="rp-card"><h1>Akses baca saja</h1><p>Hubungi sekretaris atau admin untuk membuat rapat.</p><Link href="/admin/rapat">Kembali ke rapat</Link></section>;
  function edit(next: MeetingInput) { setDirty(true); setValue(next); }
  async function create() {
    if (submitting.current) return;
    const issues = metadataIssues(value);
    if (issues.length) { setError(new Error(issues.join(' '))); return; }
    submitting.current = true; setBusy(true); setError(null);
    try {
      const meeting = await request<Meeting>('meetings', { method: 'POST', body: JSON.stringify(value) });
      setDirty(false); router.push(`/admin/rapat/${encodeURIComponent(meeting.id)}?tab=audio`);
    } catch (e) { setError(asError(e)); submitting.current = false; setBusy(false); }
  }
  return <div className="rp-quick-create"><Link className="rp-back" href="/admin/rapat"><ArrowLeft size={16}/> Semua rapat</Link>
    <div className="rp-heading"><div><p className="rp-eyebrow">RAPAT BARU</p><h1>Mulai dari audio.</h1><p>Rekam atau unggah audio untuk dibuat transkrip. Informasi rapat dapat dilengkapi kapan saja.</p></div></div>
    <ErrorNotice error={error}/>
    <form onSubmit={e => { e.preventDefault(); void create(); }}>
      <section className="rp-card rp-quick-create-card"><div className="rp-quick-create-icon"><Mic size={26}/></div><h2>Informasi dasar</h2><p>Semua informasi bersifat opsional. Judul dan tanggal akan diisi otomatis jika dikosongkan.</p>
        <div className="rp-grid"><label>Judul rapat<input autoFocus maxLength={255} disabled={busy} value={value.title} onChange={e => edit({ ...value, title: e.target.value })} placeholder="Contoh: Evaluasi layanan November"/></label>
        <label>Tanggal rapat<input type="date" disabled={busy} value={value.meetingDate} onChange={e => edit({ ...value, meetingDate: e.target.value })}/></label></div>
        <details className="rp-disclosure rp-extra-information"><summary>Lengkapi informasi & peserta (opsional)</summary><Metadata hideBasics value={value} disabled={busy} onChange={edit}/></details>
        <div className="rp-quick-create-actions"><button className="rp-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan rapat…' : <><Mic size={17}/> Lanjut ke audio <ArrowRight size={16}/></>}</button></div>
      </section>
    </form>
  </div>;
}
