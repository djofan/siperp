'use client';
import { useEffect, useState } from 'react';
import { FileText, Paperclip, Download, Trash2, Upload, X } from 'lucide-react';
import type { Attachment, Meeting } from '@/contracts/modules/rapat';
import { request } from '../api/client';
import { dateLabel } from '../api/workflow';
import { asError, ErrorNotice, Loading, Success } from './feedback';
export default function Attachments({ meeting, locked, onRefresh, onBusy }: { meeting: Meeting; locked: boolean; onRefresh: () => Promise<Meeting>; onBusy: (busy: boolean) => void }) {
  const [items,setItems] = useState<Attachment[] | null>(null); const [busy,setBusy] = useState(false); const [error,setError] = useState<Error|null>(null); const [notice,setNotice] = useState(''); const [remove,setRemove] = useState<string|null>(null);
  useEffect(() => { const controller=new AbortController(); void request<Attachment[]>(`meetings/${encodeURIComponent(meeting.id)}/attachments`,{signal:controller.signal}).then(setItems).catch(e=>{if(!controller.signal.aborted)setError(e);});return()=>controller.abort(); },[meeting.id]);
  async function reload() {setItems(await request<Attachment[]>(`meetings/${encodeURIComponent(meeting.id)}/attachments`));}
  async function upload(files: FileList|null) {
    if(!files?.length)return;setError(null);setNotice('');
    const selected=Array.from(files);
    if((items?.length??0)+selected.length>50){setError(new Error('Maksimal 50 dokumen per rapat.'));return;}
    const invalid=selected.find(file=>!file.size||file.size>10*1024*1024||!/\.(pdf|jpe?g|png|webp|txt|csv|docx|xlsx|pptx)$/i.test(file.name));
    if(invalid){setError(new Error(`${invalid.name}: gunakan format yang didukung, maksimal 10 MB per dokumen.`));return;}
    setBusy(true);onBusy(true);
    try {let current=meeting;for(const file of selected){const data=new FormData();data.set('file',file);data.set('version',String(current.version));await request(`meetings/${encodeURIComponent(meeting.id)}/attachments`,{method:'POST',body:data});current=await onRefresh();await reload();}setNotice('Dokumen pendukung tersimpan.');}
    catch(e){setError(asError(e));}finally{setBusy(false);onBusy(false);}
  }
  async function destroy(id:string){setBusy(true);onBusy(true);setError(null);setNotice('');try{await request(`attachments/${encodeURIComponent(id)}`,{method:'DELETE',body:JSON.stringify({version:meeting.version})});await onRefresh();await reload();setRemove(null);setNotice('Dokumen dikeluarkan dari rapat.');}catch(e){setError(asError(e));}finally{setBusy(false);onBusy(false);}}
  return <section className="rp-card"><div className="rp-section-head"><div><h2><Paperclip size={18}/> Dokumen pendukung <span className="rp-count">{items?.length??0}</span></h2><p>Undangan, materi, daftar hadir, atau dokumen hasil rapat. Terpisah dari bahan audio.</p></div></div><ErrorNotice error={error}/>{notice&&<Success>{notice}</Success>}{!locked&&<label className="rp-upload"><Upload size={22}/><strong>Tambahkan dokumen rapat</strong><span>PDF, JPG, PNG, WEBP, Word, Excel, PowerPoint, TXT, CSV · maks. 10 MB per berkas</span><input aria-label="Pilih dokumen pendukung" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.txt,.csv" disabled={busy||items===null} onChange={e=>{void upload(e.target.files);e.target.value='';}}/></label>}{items===null&&!error?<Loading text="Memuat dokumen…"/>:!items?.length?<div className="rp-empty-small"><FileText size={22}/><p>Belum ada dokumen pendukung yang dicatat.</p></div>:<div className="rp-document-list">{items.map(file=><div className="rp-document" key={file.id}><span className="rp-document-icon"><FileText size={20}/></span><div className="rp-document-body"><strong>{file.name}</strong><small>{(file.size/1024/1024).toFixed(2)} MB · Ditambahkan {dateLabel(file.createdAt)}</small>{remove===file.id&&<div className="rp-inline-confirm"><p>Keluarkan dokumen ini dari rapat?</p><button type="button" className="rp-danger-button" disabled={busy||locked} onClick={()=>void destroy(file.id)}>Ya, keluarkan</button><button type="button" disabled={busy} onClick={()=>setRemove(null)}><X size={13}/> Batal</button></div>}</div><a className="rp-icon-button" aria-label={`Unduh ${file.name}`} href={`/api/rapat/attachments/${encodeURIComponent(file.id)}`} download><Download size={17}/></a>{!locked&&<button className="rp-icon-button" type="button" disabled={busy} aria-label={`Keluarkan ${file.name}`} onClick={()=>setRemove(file.id)}><Trash2 size={16}/></button>}</div>)}</div>}{locked&&<p className="rp-note">Dokumen tetap dapat diunduh. Penambahan dan penghapusan mengikuti status serta akses rapat.</p>}</section>;
}
