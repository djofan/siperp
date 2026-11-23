"use client";
import { formatNumericText } from "@/lib/number-format";

/* eslint-disable @next/next/no-img-element -- display original public gallery images without an optimizer or cropping */

import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./PhotoLightbox.module.css";

type Photo = { image: string; caption?: string | null; isDemo?: boolean };
export function PhotoLightbox({photos,title,index,onChange,onClose}:{photos:Photo[];title:string;index:number|null;onChange:(index:number)=>void;onClose:()=>void}) {
  const opener=useRef<HTMLElement|null>(null);
  const touch=useRef<{id:number;x:number;y:number}|null>(null);
  const active=Math.max(0,Math.min(index??0,photos.length-1));
  const photo=photos[active];
  function move(direction:number){onChange(Math.max(0,Math.min(active+direction,photos.length-1)));}
  return <Dialog.Root open={index!==null&&!!photo} onOpenChange={open=>{if(!open)onClose();}}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay}/>
      <Dialog.Content className={styles.content} onOpenAutoFocus={()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;}} onCloseAutoFocus={event=>{event.preventDefault();if(opener.current?.isConnected)opener.current.focus({preventScroll:true});}} onKeyDown={event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();move(event.key==="ArrowRight"?1:-1);}}}>
        <header className={styles.header}>
          <div><Dialog.Title className={styles.title}>{title}</Dialog.Title><Dialog.Description className={styles.description}>Galeri foto · {formatNumericText(active+1)} dari {formatNumericText(photos.length)}</Dialog.Description></div>
          <Dialog.Close className={styles.close} aria-label="Tutup foto"><X size={21}/></Dialog.Close>
        </header>
        <div className={styles.stage} onPointerDown={event=>{if(event.pointerType==="touch"&&event.isPrimary)touch.current={id:event.pointerId,x:event.clientX,y:event.clientY};}} onPointerCancel={()=>{touch.current=null;}} onPointerUp={event=>{const start=touch.current;touch.current=null;if(!start||start.id!==event.pointerId)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.25)move(dx<0?1:-1);}}>
          {photo&&<img key={photo.image} src={photo.image} alt={photo.caption||`Dokumentasi ${title}`} draggable={false}/>}
          {photos.length>1&&<><button type="button" className={`${styles.arrow} ${styles.previous}`} disabled={active===0} aria-label="Lihat foto sebelumnya" onClick={()=>move(-1)}><ChevronLeft size={25}/></button><button type="button" className={`${styles.arrow} ${styles.next}`} disabled={active===photos.length-1} aria-label="Lihat foto berikutnya" onClick={()=>move(1)}><ChevronRight size={25}/></button></>}
        </div>
        <footer className={styles.footer}>
          <div>{photo?.isDemo&&<span className={styles.demo}>Foto contoh</span>}<p>{photo?.caption||`Dokumentasi ${title}`}</p></div>
          <span className={styles.counter} aria-live="polite" aria-atomic="true">{formatNumericText(active+1)} / {formatNumericText(photos.length)}</span>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
