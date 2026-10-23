"use client";

import { useCallback, useState } from "react";
import type { DocumentationPhoto } from "@/contracts/modules/lazsip";
import { ImageUploadField } from "./ImageUploadField";
import { LoadingButton } from "./LoadingButton";
import { panelClasses } from "@/components/ui/panel";

export function useDocumentationEditor(initialPhotos:DocumentationPhoto[]=[]){
  const [photos,setPhotos]=useState(initialPhotos);
  const [uploads,setUploads]=useState<Record<string,boolean>>({});
  const uploadChanged=useCallback((id:string,busy:boolean)=>setUploads(items=>({...items,[id]:busy})),[]);
  return {photos,setPhotos,uploads,uploadChanged,uploading:Object.values(uploads).some(Boolean)};
}
export function DocumentationEditor({editor,kind,saving}:{editor:ReturnType<typeof useDocumentationEditor>;kind:string;saving:boolean}){
  const {photos,setPhotos,uploads,uploadChanged,uploading}=editor;
  function update(id:string,patch:Partial<DocumentationPhoto>){setPhotos(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
  function move(index:number,direction:number){setPhotos(items=>{const next=[...items],target=index+direction;if(target<0||target>=next.length)return items;[next[index],next[target]]=[next[target],next[index]];return next;});}
  const button="rounded-full border border-lazsip-primary-200 px-3 py-1.5 text-xs text-lazsip-primary-900 disabled:opacity-30 dark:border-white/15 dark:text-white";
  return <section className={panelClasses("p-5")} aria-label={`Galeri dokumentasi ${kind}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-lazsip-primary-900 dark:text-white">Galeri dokumentasi {kind}</h3><p className="mt-2 text-xs leading-6 text-lazsip-primary-800/60 dark:text-white/50">Foto ditampilkan setelah deskripsi di halaman publik. Tambahkan keterangan dan atur urutannya. Hindari data pribadi sensitif.</p></div><button type="button" disabled={saving} className={button} onClick={()=>setPhotos(items=>[...items,{id:crypto.randomUUID(),image:"",caption:"",isDemo:false}])}>+ Tambah foto</button></div>
    {!photos.length&&<p className="mt-5 text-xs text-lazsip-primary-800/50 dark:text-white/45">Belum ada dokumentasi. Galeri disembunyikan jika tidak ada foto.</p>}
    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">{photos.map((photo,index)=><div key={photo.id} className="rounded-2xl bg-lazsip-primary-50/50 p-4 dark:bg-white/5"><div className="mb-4 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-lazsip-primary-900 dark:text-white">Foto {index+1}{photo.isDemo?" · Contoh":""}</span><div className="flex gap-2"><button type="button" className={button} disabled={saving||index===0} aria-label={`Majukan foto ${index+1}`} onClick={()=>move(index,-1)}>←</button><button type="button" className={button} disabled={saving||index===photos.length-1} aria-label={`Mundurkan foto ${index+1}`} onClick={()=>move(index,1)}>→</button><button type="button" className="rounded-full bg-red-50 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40 dark:bg-red-400/10 dark:text-red-300" disabled={saving||uploads[photo.id]} aria-label={`Hapus foto dokumentasi ${index+1}`} onClick={()=>setPhotos(items=>items.filter(item=>item.id!==photo.id))}>Hapus</button></div></div><ImageUploadField label={`Foto dokumentasi ${index+1}`} initialUrl={photo.image} onChange={url=>update(photo.id,{image:url??"",isDemo:false})} onUploadingChange={busy=>uploadChanged(photo.id,busy)}/><label className="mt-4 block text-xs text-lazsip-primary-900 dark:text-white" htmlFor={`documentation-caption-${photo.id}`}>Keterangan foto</label><textarea id={`documentation-caption-${photo.id}`} rows={2} maxLength={500} value={photo.caption??""} onChange={event=>update(photo.id,{caption:event.target.value})} placeholder="Tuliskan dokumentasi yang terlihat pada foto" className="mt-2 w-full resize-none rounded-xl border border-lazsip-primary-200 bg-white px-3 py-2 text-xs text-lazsip-primary-900 dark:border-white/10 dark:bg-white/5 dark:text-white"/></div>)}</div>
    {photos.length>0&&<div className="mt-5"><LoadingButton type="submit" loading={saving} disabled={uploading}>Simpan {kind} dan galeri</LoadingButton></div>}
  </section>;
}
