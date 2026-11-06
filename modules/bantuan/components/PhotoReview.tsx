"use client";
/* eslint-disable @next/next/no-img-element -- private authenticated images and local previews bypass public optimization */
import { useCallback, useState, useSyncExternalStore } from "react";
import { documentLabels, type AidDetail } from "@/contracts/modules/bantuan";
import { emptyPhotos, photoSnapshot, subscribePhotos } from "../api/photo-queue";
import { Dialog } from "./ui";
import s from "./Workspace.module.css";

export function PhotoReview({owner,applicationId,documents,allDocuments=false}:{owner:string;applicationId:string;documents:AidDetail["documents"];allDocuments?:boolean}){
  const subscribe=useCallback((listener:()=>void)=>subscribePhotos(owner,applicationId,listener),[owner,applicationId]);
  const snapshot=useCallback(()=>photoSnapshot(owner,applicationId),[owner,applicationId]);
  const queue=useSyncExternalStore(subscribe,snapshot,emptyPhotos);
  const [preview,setPreview]=useState<{src:string;title:string}|null>(null);
  const kinds=["face","ktp","kk","supporting"],ids=new Set(documents.map(doc=>doc.id));
  const photos=[...documents.filter(doc=>allDocuments||kinds.includes(doc.kind)).map(doc=>({...doc,src:`/api/bantuan/documents/${doc.id}`,status:"Tersimpan"})),
    ...queue.filter(photo=>!allDocuments&&!ids.has(photo.id)&&kinds.includes(photo.kind)).map(photo=>({...photo,src:photo.prepared?photo.data:"",status:photo.status==="done"?"Tersimpan":photo.status==="error"?"Gagal diunggah":"Sedang diunggah"}))];
  if(!photos.length)return <p className={s.privacyNote}>Belum ada foto dilampirkan. Untuk WhatsApp, foto bersifat opsional.</p>;
  return <><div className={s.reviewPhotos}>{photos.map((photo,i)=><article className={s.reviewPhotoCard} key={photo.id}>
    <button type="button" disabled={!photo.src} onClick={()=>setPreview({src:photo.src,title:documentLabels[photo.kind]})} aria-label={`Perbesar ${documentLabels[photo.kind]} ${i+1}`}>
      {photo.src?<img src={photo.src} alt={`${documentLabels[photo.kind]} ${i+1}`}/>:<span>Menyiapkan foto…</span>}
    </button><div><strong>{documentLabels[photo.kind]}</strong><small>{photo.status}</small>{photo.caption&&<p>{photo.caption}</p>}</div>
  </article>)}</div>{preview&&<Dialog title={preview.title} onClose={()=>setPreview(null)} wide><img className={s.largePhoto} src={preview.src} alt={preview.title}/></Dialog>}</>;
}
