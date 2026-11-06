"use client";
import { useState } from "react";
import type { LearningModule, ParticipantReport, ReportResponse } from "./types";
import s from "./Reports.module.css";

export function ReportExport({module,query}:{module:LearningModule;query:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function download(){
    setBusy(true);setError("");
    try{
      const all:ParticipantReport[]=[];const params=new URLSearchParams(query);params.set("per_page","100");
      let page=1,last=1;
      do{params.set("page",String(page));const response=await fetch(`/api/${module}/reports/participants?${params}`,{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error?.message??"Laporan belum dapat diunduh.");const result=body as ReportResponse;all.push(...result.data);last=result.meta.last_page;page++;}while(page<=last);
      const {buildReportWorkbook}=await import("./workbook");const bytes=await buildReportWorkbook(module,query,all);const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));const link=document.createElement("a");link.href=url;link.download=`laporan-${module}-${new Date().toISOString().slice(0,10)}.xlsx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setError(e instanceof Error?e.message:"Ekspor gagal. Coba lagi.");}finally{setBusy(false);}
  }
  return <div><button type="button" className={s.button} disabled={busy} onClick={()=>void download()}>{busy?"Menyiapkan Excel…":"Unduh Excel sesuai filter"}</button>{error&&<p role="alert" className={s.error}>{error}</p>}</div>;
}
