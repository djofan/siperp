"use client";
import {useState} from "react";
import type {AidDetail,BantuanViewer} from "@/contracts/modules/bantuan";
import {hasAnyRole} from "../permissions";
import {request,day} from "../api/client";
import s from "./SurveyReminder.module.css";
export function SurveyReminder({row,viewer}:{row:AidDetail;viewer:BantuanViewer}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[link,setLink]=useState("");
 if(!row.surveyDeadline?.overdue)return null;
 async function remind(){setBusy(true);setError("");try{const data=await request<{url:string}>(`applications/${row.id}/remind-survey`,{method:"POST"});setLink(data.url);}catch(e){setError(e instanceof Error?e.message:"Pengingat belum dapat disiapkan.");}finally{setBusy(false);}}
 return <section className={s.notice} role="status"><strong>Survei perlu ditindaklanjuti</strong><p>Belum dikirim setelah {row.surveyDeadline.days} hari sejak penugasan. Batas tindak lanjut: {day(row.surveyDeadline.dueAt)}.</p>{hasAnyRole(viewer,["admin","call_center"])&&<><button className={s.button} type="button" disabled={busy} onClick={()=>void remind()}>{busy?"Menyiapkan pesan…":"Ingatkan verifikator"}</button>{link&&<p>Notifikasi web sudah dibuat. <a className={s.button} href={link} target="_blank" rel="noopener noreferrer">Buka WhatsApp & periksa pesan</a><small>Pesan baru terkirim setelah Anda menekan Kirim di WhatsApp.</small></p>}{error&&<p role="alert">{error}</p>}</>}</section>;
}
