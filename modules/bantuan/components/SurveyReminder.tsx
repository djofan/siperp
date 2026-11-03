"use client";
import {useState} from "react";
import {Clock3, BellRing, Check, ArrowUpRight, MessageCircle} from "lucide-react";
import type {AidDetail,BantuanViewer} from "@/contracts/modules/bantuan";
import {hasAnyRole} from "../permissions";
import {request,day} from "../api/client";
import s from "./SurveyReminder.module.css";
export function SurveyReminder({row,viewer,assignment=false}:{row:AidDetail;viewer:BantuanViewer;assignment?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[link,setLink]=useState("");
 if(assignment ? row.status!=="survey_assigned" : !row.surveyDeadline?.overdue)return null;
 async function remind(){setBusy(true);setError("");try{const data=await request<{url:string}>(`applications/${row.id}/remind-survey`,{method:"POST",body:JSON.stringify({purpose:assignment?"assignment":"reminder"})});setLink(data.url);}catch(e){setError(e instanceof Error?e.message:"Pengingat belum dapat disiapkan.");}finally{setBusy(false);}}
 return <section className={s.notice} data-assignment={assignment} aria-label={assignment?"Informasi penugasan survei":"Pengingat survei"}>
  <div className={s.information}>
   <span className={s.icon} aria-hidden="true">{assignment?<Check size={20}/>:<Clock3 size={20}/>}</span>
   <div className={s.copy}>
    <strong>{assignment?"Verifikator sudah ditugaskan":"Survei perlu ditindaklanjuti"}</strong>
    <p>{assignment?"Penugasan tersimpan. Beri tahu verifikator melalui WhatsApp.":`Hasil survei belum dikirim. Batas tindak lanjut ${day(row.surveyDeadline!.dueAt)}.`}</p>
    <span className={s.meta}>{assignment?"Informasi tugas mencakup pemohon dan alamat survei terbaru.":`Pengingat aktif setelah ${row.surveyDeadline!.days} hari sejak penugasan.`}</span>
   </div>
  </div>
  {hasAnyRole(viewer,["admin","call_center"])&&<div className={s.actions}>
   {link?<>
    <span className={s.sent} role="status"><Check size={14}/>{assignment?"Pesan penugasan siap":"Notifikasi web sudah dibuat"}</span>
    <a className={s.button} href={link} target="_blank" rel="noopener noreferrer">Buka WhatsApp<ArrowUpRight size={16}/></a>
    <small>Periksa pesan, lalu tekan Kirim di WhatsApp.</small>
   </>:<>
    <button className={s.button} type="button" disabled={busy} onClick={()=>void remind()}>{assignment?<MessageCircle size={16}/>:<BellRing size={16}/>}{busy?"Menyiapkan pesan...":assignment?"Siapkan pesan WhatsApp":"Ingatkan verifikator"}</button>
    <small>{assignment?"Buka pesan, periksa, lalu kirim lewat WhatsApp.":"Buat notifikasi web dan siapkan pesan WhatsApp."}</small>
   </>}
  </div>}
  {error&&<p className={s.error} role="alert">{error}</p>}
 </section>;
}
