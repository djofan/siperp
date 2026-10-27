"use client";
/* eslint-disable @next/next/no-img-element -- authenticated document URLs and local previews must not use the public image optimizer */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, Check, CircleAlert, ImagePlus, LoaderCircle, RefreshCw, Trash2, X } from "lucide-react";
import { documentLabels, type AidDetail } from "@/contracts/modules/bantuan";
import { addPhotos, emptyPhotos, photoSnapshot, pumpPhotos, removePhoto, retryPhoto, startPhotos, subscribePhotos } from "../api/photo-queue";
import { Button, Dialog } from "./ui";
import s from "./Workspace.module.css";

export interface PhotoRequirement {kind:string;minimum:number;hint?:string}
export const intakePhotos=(source:string):PhotoRequirement[]=>[{kind:"face",minimum:source==="online"?0:1,hint:"Wajah jelas, tanpa penutup."},{kind:"ktp",minimum:source==="online"?0:1,hint:"Seluruh kartu dan tulisan dapat dibaca."},{kind:"kk",minimum:0,hint:"Kartu keluarga, jika tersedia."},{kind:"supporting",minimum:0,hint:"Bisa beberapa foto, masing-masing dengan keterangan."}];
export const surveyPhotos:PhotoRequirement[]=[
  {kind:"survey_recipient",minimum:1},{kind:"survey_front",minimum:1},{kind:"survey_inside",minimum:2,hint:"Ambil dua sudut ruangan yang berbeda."},
  {kind:"survey_environment",minimum:1},{kind:"sktm",minimum:0},{kind:"survey_other",minimum:0},
];
export const handoverPhotos:PhotoRequirement[]=[{kind:"handover",minimum:1},{kind:"certificate",minimum:1,hint:"Foto sertifikat kertas yang telah diserahkan."},{kind:"receipt",minimum:0}];
export function PhotoSlots({owner,applicationId,documents=[],requirements,editable=true,onReady,onUploaded,minimumTotal=0}:
  {owner:string;applicationId:string;documents?:AidDetail["documents"];requirements:PhotoRequirement[];editable?:boolean;
   onReady?:(ready:boolean,missing:string[])=>void;onUploaded?:()=>void;minimumTotal?:number}){
  const subscribe=useCallback((fn:()=>void)=>subscribePhotos(owner,applicationId,fn),[owner,applicationId]);
  const snapshot=useCallback(()=>photoSnapshot(owner,applicationId),[owner,applicationId]);
  const queue=useSyncExternalStore(subscribe,snapshot,emptyPhotos);
  const [error,setError]=useState(""),[preview,setPreview]=useState<{src:string;title:string}|null>(null),[remove,setRemove]=useState<{id:string;server:boolean}|null>(null),[removing,setRemoving]=useState(false);
  const lastDone=useRef("");
  const [selection,setSelection]=useState<{kind:string;files:File[];captions:string[]}|null>(null),[adding,setAdding]=useState(false);
  useEffect(()=>{
    let live=true;void startPhotos(owner,applicationId).catch(e=>{if(live)setError(e.message);});
    const retry=()=>{void pumpPhotos(owner,applicationId);};
    window.addEventListener("online",retry);const timer=setInterval(retry,15000);
    return()=>{live=false;clearInterval(timer);window.removeEventListener("online",retry);};
  },[owner,applicationId]);
  const ids=new Set(documents.map(d=>d.id));
  const staged=queue.filter(p=>!ids.has(p.id)&&requirements.some(r=>r.kind===p.kind));
  const relevant=documents.filter(d=>requirements.some(r=>r.kind===d.kind)&&!(editable&&d.kind.startsWith("survey_")&&d.used_at));
  const count=(kind:string)=>relevant.filter(d=>d.kind===kind).length+staged.filter(p=>p.kind===kind&&p.status==="done").length;
  const missing=requirements.filter(r=>count(r.kind)<r.minimum).map(r=>`${documentLabels[r.kind]} (${count(r.kind)}/${r.minimum})`);
  const totalPhotos=requirements.filter(r=>r.kind.startsWith("survey_")).reduce((sum,r)=>sum+count(r.kind),0);
  if(minimumTotal>totalPhotos)missing.push(`Minimal ${minimumTotal} foto survei, saat ini ${totalPhotos}`);
  if(staged.some(p=>p.status!=="done"))missing.push("Tunggu semua unggahan selesai atau hapus foto yang gagal.");
  const ready=missing.length===0;
  const missingKey=missing.join("|");
  useEffect(()=>{onReady?.(ready,missingKey?missingKey.split("|"):[]);},[ready,missingKey,onReady]);
  const done=queue.filter(p=>p.status==="done").map(p=>p.id).join(",");
  useEffect(()=>{if(done&&done!==lastDone.current){lastDone.current=done;onUploaded?.();}},[done,onUploaded]);
  function select(kind:string,files:FileList|null){if(!files?.length)return;setError("");setSelection({kind,files:Array.from(files),captions:Array.from(files,()=>"")});}
  const requiredCount=requirements.reduce((sum,r)=>sum+r.minimum,0),filledCount=requirements.reduce((sum,r)=>sum+Math.min(count(r.kind),r.minimum),0);
  return <div className={s.photoSection}>
    {requiredCount>0&&<div className={s.photoSummary}><div><strong>{filledCount} dari {requiredCount} foto wajib terpenuhi</strong><p>{ready?"Dokumen wajib lengkap. Anda bisa melanjutkan.":"Ketuk slot untuk mengambil foto. Unggahan berjalan di latar belakang."}</p></div><span className={ready?s.readyIcon:s.photoCounter}>{ready?<Check size={20}/>:filledCount+"/"+requiredCount}</span></div>}
    {error&&<div className={`${s.notice} ${s.error}`} role="alert">{error}</div>}
    <div className={s.photoGrid}>{requirements.map(slot=>{
      const saved=relevant.filter(d=>d.kind===slot.kind),pending=staged.filter(d=>d.kind===slot.kind),fulfilled=count(slot.kind)>=slot.minimum;
      return <section className={s.photoSlot} data-complete={slot.minimum>0&&fulfilled} key={slot.kind}>
        <div className={s.slotHeading}><div><h3>{documentLabels[slot.kind]??slot.kind}</h3><p>{slot.minimum?`Wajib · ${slot.minimum} foto`:"Opsional"}{slot.hint?" · "+slot.hint:""}</p></div>{slot.minimum>0&&<span className={fulfilled?s.readyIcon:s.slotCount}>{fulfilled?<Check size={16}/>:count(slot.kind)+"/"+slot.minimum}</span>}</div>
        <div className={s.photoThumbs}>
          {saved.map(doc=><div key={doc.id} className={s.photoItem}><button type="button" className={s.photoPreview} onClick={()=>setPreview({src:`/api/bantuan/documents/${doc.id}`,title:documentLabels[doc.kind]})}><img alt={documentLabels[doc.kind]} src={`/api/bantuan/documents/${doc.id}`}/></button><span className={s.photoStatus}><Check size={12}/> Tersimpan</span>{doc.caption&&<p className={s.photoCaption}>{doc.caption}</p>}{editable&&!doc.used_at&&<button type="button" className={s.removePhoto} aria-label={`Hapus ${documentLabels[doc.kind]}`} onClick={()=>setRemove({id:doc.id,server:true})}><X size={13}/></button>}</div>)}
          {pending.map(photo=><div key={photo.id} className={s.photoItem}><button type="button" className={s.photoPreview} onClick={()=>photo.prepared&&setPreview({src:photo.data,title:documentLabels[photo.kind]})}>{photo.prepared||!/hei[cf]/i.test(photo.name)?<img alt={photo.name} src={photo.data}/>:<ImagePlus size={27}/>}</button>
            <span className={`${s.photoStatus} ${photo.status==="error"?s.photoError:""}`}>{photo.status==="done"?<><Check size={12}/> Tersimpan</>:photo.status==="error"?<><CircleAlert size={12}/> Gagal</>:photo.status==="uploading"?<><LoaderCircle className={s.spin} size={12}/>{photo.progress}%</>:photo.status==="preparing"?"Menyiapkan…":"Menunggu"}</span>
            {photo.caption&&<p className={s.photoCaption}>{photo.caption}</p>}{photo.status==="error"&&<button className={s.retryPhoto} type="button" onClick={()=>void retryPhoto(owner,applicationId,photo.id)} title={photo.error}><RefreshCw size={12}/> Coba lagi</button>}
            {editable&&!["preparing","uploading"].includes(photo.status)&&<button type="button" className={s.removePhoto} aria-label={`Hapus ${photo.name}`} onClick={()=>setRemove({id:photo.id,server:photo.status==="done"})}><X size={13}/></button>}
          </div>)}
          {!saved.length&&!pending.length&&<div className={s.photoPlaceholder}><Camera size={27} strokeWidth={1.3}/><span>Belum ada foto</span></div>}
        </div>
        {editable&&<div className={s.photoSources}><label className={s.cameraButton}><Camera size={16}/>Ambil foto<input className={s.srOnly} type="file" accept="image/*,.heic,.heif" capture="environment" onChange={e=>{void select(slot.kind,e.target.files);e.target.value="";}}/></label>
          <label className={s.galleryButton}><ImagePlus size={16}/>Galeri<input className={s.srOnly} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple={slot.minimum!==1} onChange={e=>{void select(slot.kind,e.target.files);e.target.value="";}}/></label></div>}
      </section>;
    })}</div>
    {editable&&<p className={s.privacyNote}>Foto dikompresi di perangkat. Antrean lokal terenkripsi dan dilanjutkan ketika koneksi kembali. Hapus foto lama lalu pilih penggantinya untuk memperbaiki foto.</p>}
    {selection&&<Dialog title={`Unggah ${documentLabels[selection.kind]}`} description="Tambahkan keterangan untuk masing-masing foto (opsional)." onClose={()=>!adding&&setSelection(null)}><div className={s.photoCaptionForm}>{selection.files.map((file,i)=><label className={s.field} key={i}><span>Foto {i+1} · {file.name}</span><textarea className={s.input} aria-label={`Keterangan foto ${i+1}`} placeholder="Tulis keterangan foto…" maxLength={1000} disabled={adding} value={selection.captions[i]} onChange={e=>setSelection(current=>current?{...current,captions:current.captions.map((caption,index)=>index===i?e.target.value:caption)}:null)}/></label>)}<div className={s.actions}><Button variant="secondary" disabled={adding} onClick={()=>setSelection(null)}>Batal</Button><Button disabled={adding} onClick={async()=>{setAdding(true);try{await addPhotos(owner,applicationId,selection.kind,selection.files,selection.captions);setSelection(null);}catch(e){setError(e instanceof Error?e.message:"Foto belum tersimpan.");}finally{setAdding(false);}}}>{adding?"Menyiapkan…":"Unggah foto"}</Button></div></div></Dialog>}
    {preview&&<Dialog title={preview.title} onClose={()=>setPreview(null)} wide><img className={s.largePhoto} src={preview.src} alt={preview.title}/></Dialog>}
    {remove&&<Dialog title="Hapus foto ini?" description="Foto tidak lagi dihitung sebagai kelengkapan. Bukti yang sudah dipakai tidak bisa dihapus." onClose={()=>!removing&&setRemove(null)}><div className={s.actions}><Button variant="secondary" onClick={()=>setRemove(null)} disabled={removing}>Batal</Button><Button variant="danger" disabled={removing} onClick={async()=>{setRemoving(true);try{await removePhoto(owner,applicationId,remove.id,remove.server);setRemove(null);onUploaded?.();}catch(e){setError(e instanceof Error?e.message:"Foto belum dapat dihapus.");setRemove(null);}finally{setRemoving(false);}}}><Trash2 size={16}/>{removing?"Menghapus…":"Hapus foto"}</Button></div></Dialog>}
  </div>;
}
