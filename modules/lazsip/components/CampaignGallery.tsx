"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CampaignDocumentationPhoto } from "@/lib/domain";
import styles from "./CampaignGallery.module.css";

export function CampaignGallery({photos,title,kind="campaign"}:{photos:CampaignDocumentationPhoto[];title:string;kind?:"campaign"|"activity"|"program"}){
  const strip=useRef<HTMLDivElement>(null);
  const id=useId();
  const [page,setPage]=useState(0);
  const pageCount=Math.ceil(photos.length/2);
  const active=Math.min(page,Math.max(0,pageCount-1));
  const syncPage=useCallback(()=>{
    const node=strip.current;
    if(!node||!node.firstElementChild)return;
    const step=node.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(node).columnGap||"0");
    const last=Math.max(0,Math.ceil(photos.length/2)-1);
    const atEnd=node.scrollWidth>node.clientWidth&&node.scrollLeft>=node.scrollWidth-node.clientWidth-2;
    setPage(atEnd?last:Math.min(last,Math.round(node.scrollLeft/(step*2))));
  },[photos.length]);
  useEffect(()=>{
    const node=strip.current;if(!node)return;
    const observer=new ResizeObserver(syncPage);observer.observe(node);
    return ()=>observer.disconnect();
  },[syncPage]);
  const category=kind==="activity"?"kegiatan":kind==="program"?"program pemberdayaan":"campaign";
  if(!photos.length)return null;
  function goToPage(target:number){const node=strip.current;if(!node?.firstElementChild)return;const step=node.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(node).columnGap||"0");const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;node.scrollTo({left:Math.max(0,Math.min(target,pageCount-1))*step*2,behavior:reduced?"instant":"smooth"});}
  function scroll(direction:number){goToPage(active+direction);}
  return <section className={styles.gallery} aria-labelledby={`${id}-heading`}>
    <header className={styles.heading}>
      <div className={styles.headingTitle}><h2 id={`${id}-heading`}>{kind==="campaign"?"Dokumentasi campaign":`Galeri ${category}`}</h2><span className={styles.count}>{photos.length} foto</span></div>
      <div className={styles.navigation}><span className={styles.hint}>Geser untuk melihat lainnya</span><div className={styles.controls}><button type="button" disabled={active===0} aria-label="Foto sebelumnya" onClick={()=>scroll(-1)}>←</button><button type="button" disabled={active===pageCount-1} aria-label="Foto berikutnya" onClick={()=>scroll(1)}>→</button></div></div>
    </header>
    <div ref={strip} className={styles.strip} onScroll={syncPage} tabIndex={0} aria-label={`Galeri foto ${category}, geser kiri atau kanan`} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();scroll(event.key==="ArrowRight"?1:-1);}}}>
      {photos.map((photo,index)=><figure className={styles.card} key={photo.id}><div className={styles.photo}>
        {/* eslint-disable-next-line @next/next/no-img-element -- media dari upload admin */}
        <img src={photo.image} alt={photo.caption||`Dokumentasi ${title}`} loading="lazy" draggable={false}/>{photo.isDemo&&<span className={styles.demo}>Contoh dokumentasi</span>}
      </div><figcaption><span>{String(index+1).padStart(2,"0")}</span><p>{photo.caption||`Dokumentasi ${category}`}{photo.isDemo&&<small>Foto dummy untuk pratinjau, bukan dokumentasi asli {category} ini.</small>}</p></figcaption></figure>)}
    </div>
    {pageCount>1&&<nav className={styles.dots} aria-label="Pilih halaman galeri">{Array.from({length:pageCount},(_,index)=><button key={index} type="button" aria-label={`Tampilkan foto ${index*2+1} sampai ${Math.min(index*2+2,photos.length)}`} aria-current={active===index?"page":undefined} onClick={()=>goToPage(index)}><span aria-hidden="true"/></button>)}</nav>}
  </section>;
}
