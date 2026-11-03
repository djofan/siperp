"use client";
import {useState} from "react";
import {Clock3, BellRing, Check, ArrowUpRight} from "lucide-react";
import type {AidDetail,BantuanViewer} from "@/contracts/modules/bantuan";
import {hasAnyRole} from "../permissions";
import {request,day} from "../api/client";
import s from "./SurveyReminder.module.css";
export function SurveyReminder({row,viewer}:{row:AidDetail;viewer:BantuanViewer}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[link,setLink]=useState("");
 if(!row.surveyDeadline?.overdue)return null;
 async function remind(){setBusy(true);setError("");try{const data=await request<{url:string}>(`applications/${row.id}/remind-survey`,{method:"POST"});setLink(data.url);}catch(e){setError(e instanceof Error?e.message:"Pengingat belum dapat disiapkan.");}finally{setBusy(false);}}
 return <section className={s.notice} aria-label="Pengingat survei">
  <div className={s.information}>
   <span className={s.icon} aria-hidden="true"><Clock3 size={20}/></span>
   <div className={s.copy}>
    <strong>Survei perlu ditindaklanjuti</strong>
    <p>Hasil survei belum dikirim. Batas tindak lanjut {day(row.surveyDeadline.dueAt)}.</p>
    <span className={s.meta}>Pengingat aktif setelah {row.surveyDeadline.days} hari sejak penugasan.</span>
   </div>
  </div>
  {hasAnyRole(viewer,["admin","call_center"])&&<div className={s.actions}>
   {link?<>
    <span className={s.sent} role="status"><Check size={14}/>Notifikasi web sudah dibuat</span>
    <a className={s.button} href={link} target="_blank" rel="noopener noreferrer">Buka WhatsApp<ArrowUpRight size={16}/></a>
    <small>Periksa pesan, lalu tekan Kirim di WhatsApp.</small>
   </>:<>
    <button className={s.button} type="button" disabled={busy} onClick={()=>void remind()}><BellRing size={16}/>{busy?"Menyiapkan pengingat...":"Ingatkan verifikator"}</button>
    <small>Buat notifikasi web dan siapkan pesan WhatsApp.</small>
   </>}
  </div>}
  {error&&<p className={s.error} role="alert">{error}</p>}
 </section>;
}
