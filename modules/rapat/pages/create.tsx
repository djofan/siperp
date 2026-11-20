"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Save, Check, FileCheck2 } from 'lucide-react';
import type { Meeting, MeetingInput, Minutes, Settings } from '@/contracts/modules/rapat';
import { useViewer } from '../components/context';
import Metadata from '../components/metadata';
import MinutesEditor from '../components/minutes';
import Review from '../components/review';
import { canCreate } from '../api/policy';
import { cleanMinutes, emptyMinutes, finalizeIssues, localDate, metadataIssues } from '../api/workflow';
import { request } from '../api/client';
import { ErrorNotice, asError } from '../components/feedback';
import { useUnsavedGuard } from '../components/unsaved';
export default function Create() {
  const viewer=useViewer(); const router=useRouter(); const [step,setStep]=useState(0); const [dirty,setDirty]=useState(false);
  const [value,setValue]=useState<MeetingInput>({title:'',meetingDate:localDate(),startTime:'',endTime:'',location:'',agenda:'',chair:'',notetaker:viewer.name,template:'dinas',participants:[],institution:viewer.institution});
  const [minutes,setMinutes]=useState<Minutes>(emptyMinutes); const [busy,setBusy]=useState(false); const [error,setError]=useState<Error|null>(null); const saved=useRef<Meeting|null>(null);const metadataTouched=useRef(false);
  useUnsavedGuard(dirty);
  useEffect(()=>{if(viewer.role==='admin')void request<Settings>('settings').then(settings=>setValue(v=>({...v,participants:metadataTouched.current?v.participants:settings.participants,institution:metadataTouched.current?v.institution:settings.institution}))).catch(()=>{});},[viewer.role]);
  if(!canCreate(viewer))return <section className="rp-card"><h1>Akses baca saja</h1><p>Hubungi sekretaris atau admin untuk membuat rapat.</p><Link href="/admin/rapat">Kembali ke rapat</Link></section>;
  const issues=[...metadataIssues(value),...finalizeIssues(minutes)];
  function next(){const issues=metadataIssues(value);if(issues.length){setError(new Error(issues.join(' ')));return;}setError(null);setStep(step+1);window.scrollTo({top:0,behavior:'smooth'});}
  async function persist(finalized:boolean){
    const issues=[...metadataIssues(value),...(finalized?finalizeIssues(minutes):[])];if(issues.length){setError(new Error(issues.join(' ')));return;}
    setBusy(true);setError(null);
    try{const payload={...value,minutes:cleanMinutes(minutes)};const meeting=await request<Meeting>(saved.current?`meetings/${encodeURIComponent(saved.current.id)}`:'meetings',{method:saved.current?'PUT':'POST',body:JSON.stringify({...payload,...(saved.current?{version:saved.current.version}:{})})});saved.current=meeting;
      if(finalized)saved.current=await request<Meeting>(`meetings/${encodeURIComponent(meeting.id)}/finalize`,{method:'POST',body:JSON.stringify({version:meeting.version,finalized:true})});
      setDirty(false);router.push(`/admin/rapat/${encodeURIComponent(meeting.id)}`);
    }catch(e){setError(asError(e));setBusy(false);}
  }
  return <><Link className="rp-back" href="/admin/rapat"><ArrowLeft size={15}/> Semua rapat</Link><div className="rp-heading"><div><p className="rp-eyebrow">RAPAT BARU</p><h1>Catat hasil rapat Anda.</h1><p>Mulai dari informasi rapat, lengkapi hasilnya, lalu tinjau sebelum final.</p></div><span className="rp-badge rp-draft-badge">Draf baru</span></div><ol className="rp-steps">{['Informasi & peserta','Hasil rapat','Tinjau & finalkan'].map((label,i)=><li key={label} className={i===step?'active':i<step?'complete':''}><span>{i<step?<Check size={14}/>:i+1}</span>{label}</li>)}</ol><ErrorNotice error={error}/><form noValidate onSubmit={e=>{e.preventDefault();if(step<2)next();else void persist(false);}}><section className="rp-card rp-editor-card">{step===0?<><div className="rp-section-head"><div><h2>Informasi rapat</h2><p>Judul dan tanggal wajib diisi. Informasi lainnya dapat dilengkapi nanti.</p></div></div><Metadata disabled={busy} value={value} onChange={v=>{metadataTouched.current=true;setDirty(true);setValue(v);}}/></>:step===1?<><div className="rp-section-head"><div><h2>Hasil rapat</h2><p>Tulis langsung ringkasan, pembahasan, keputusan, dan tindak lanjut.</p></div></div><MinutesEditor value={minutes} disabled={busy} onChange={v=>{setDirty(true);setMinutes(v);}}/></>:<Review value={value} minutes={minutes}/>}</section>{step===2&&<section className="rp-final-review"><div><h3>Sudah sesuai dengan hasil rapat?</h3><p>Notulen final dikunci dari penyuntingan. Status tugas tetap bisa diperbarui.</p>{issues.length>0&&<ul className="rp-checklist">{issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}</div><button type="button" className="rp-primary" disabled={busy||!!issues.length} onClick={()=>void persist(true)}><FileCheck2 size={16}/> Simpan & finalkan</button></section>}<div className="rp-savebar"><span>{busy?'Menyimpan…':dirty?'Perubahan belum tersimpan':'Lengkapi catatan sesuai kebutuhan'}</span><div className="rp-actions">{step>0&&<button type="button" disabled={busy} onClick={()=>{setStep(step-1);setError(null);}}><ArrowLeft size={15}/> Kembali</button>}<button type="button" disabled={busy} onClick={()=>void persist(false)}><Save size={15}/> Simpan draf</button>{step<2&&<button type="submit" disabled={busy} className="rp-primary">Lanjut <ArrowRight size={15}/></button>}</div></div></form></>;
}
