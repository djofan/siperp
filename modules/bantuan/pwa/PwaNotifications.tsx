"use client";
import { useEffect,useState } from "react";
import Link from "../components/WorkspaceNavigation";
import { Bell,ChevronRight } from "lucide-react";
import type { AidNotification,BantuanViewer } from "@/contracts/modules/bantuan";
import { day } from "../api/client";
import { canViewRoute } from "../policy";
import { pwaRequest } from "./client";
import s from "./Pwa.module.css";
function Empty({title,children}:{title:string;children:React.ReactNode}){return <div className={s.empty}><h3>{title}</h3><p>{children}</p></div>;}
function Loading(){return <p role="status">Memuat notifikasi…</p>;}
function ErrorNotice({message,retry}:{message:string;retry:()=>void}){return <div role="alert"><p>{message}</p><button onClick={retry}>Coba lagi</button></div>;}
export function PwaNotifications({viewer,onRead,refreshKey}:{viewer:BantuanViewer;onRead:()=>void;refreshKey:number}) {
  const [notes,setNotes]=useState<AidNotification[]|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(""),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();pwaRequest<AidNotification[]>("notifications",{signal:controller.signal}).then(data=>{setNotes(data);setError("");}).catch(err=>{if(!controller.signal.aborted)setError(err.message);});return()=>controller.abort();},[revision,refreshKey]);
  async function mark(note?:AidNotification){setBusy(note?.id??"all");setError("");try{await pwaRequest(note?`notifications/${note.id}/read`:"notifications/read-all",{method:"PUT"});setNotes(current=>current?.map(item=>!note||item.id===note.id?{...item,read_at:new Date().toISOString()}:item)??null);onRead();}catch(err){setError(err instanceof Error?err.message:"Notifikasi belum dapat diperbarui.");}finally{setBusy("");}}
  return <>{error&&<ErrorNotice message={error} retry={()=>setRevision(value=>value+1)}/>}<div className={s.notificationHeading}><div><h1>Notifikasi</h1><p>{notes?`${notes.filter(note=>!note.read_at).length} belum dibaca · 50 pemberitahuan terbaru`:"Pembaruan tugas dan pengajuan Anda"}</p></div>{notes?.some(note=>!note.read_at)&&<button className={s.outline} disabled={!!busy} onClick={()=>void mark()}>Tandai semua dibaca</button>}</div>{!notes?!error&&<Loading/>:!notes.length?<Empty title="Belum ada notifikasi">Tugas baru dan perubahan status akan tampil di sini.</Empty>:notes.map(note=><article className={s.notification} data-unread={!note.read_at} key={note.id}><div className={s.noteIcon}><Bell size={18}/></div><div>{!note.read_at&&<span className={s.unreadLabel}>Belum dibaca</span>}<p>{note.message}</p><small>{day(note.created_at)}</small><div className={s.notificationActions}>{!note.read_at&&<button disabled={!!busy} onClick={()=>void mark(note)}>{busy===note.id?"Menyimpan…":"Tandai dibaca"}</button>}{note.application_id&&canViewRoute(viewer,["pengajuan",note.application_id])&&<Link href={`/admin/bantuan/pengajuan/${encodeURIComponent(note.application_id)}`}>Buka pengajuan<ChevronRight size={15}/></Link>}</div></div></article>)}</>;
}
