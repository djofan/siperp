"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Files, CircleDashed, HandHeart, CheckCheck, Plus, ClipboardList, Inbox } from "lucide-react";
import { bantuanRoles, type AidDashboard, type BantuanViewer } from "@/contracts/modules/bantuan";
import { href, navigation, finalStates } from "../policy";
import { isWorkItem, queueCount, taskCopy } from "../workspace-guide";
import { LoadingState } from "./LoadingState";
import s from "./Dashboard.module.css";
import ft from "./ListTools.module.css";
import { request } from "../api/client";
import { sourceLabels } from "../list-filters";

export function Dashboard({viewer,dashboard,failed,onRetry}:{viewer:BantuanViewer;dashboard:AidDashboard|null;failed:boolean;onRetry:()=>void}){
  const [period,setPeriod]=useState({from:"",to:"",program:"",source:""}),[periodIssue,setPeriodIssue]=useState(""),[retry,setRetry]=useState(0);
  const periodQuery=JSON.stringify(period),periodKey=JSON.stringify([periodQuery,retry]),hasPeriod=Object.values(period).some(Boolean);
  const [scoped,setScoped]=useState<{key:string;data:AidDashboard|null;error:boolean}|null>(null);
  useEffect(()=>{if(!hasPeriod)return;const controller=new AbortController();let live=true;const params=new URLSearchParams(JSON.parse(periodQuery));request<AidDashboard>(`dashboard?${params}`,{signal:controller.signal}).then(data=>{if(live)setScoped({key:periodKey,data,error:false});}).catch(()=>{if(live)setScoped({key:periodKey,data:null,error:true});});return()=>{live=false;controller.abort();};},[hasPeriod,periodKey,periodQuery]);
  const summary=hasPeriod?scoped?.key===periodKey?scoped.data:null:dashboard;
  const summaryFailed=hasPeriod?scoped?.key===periodKey&&scoped.error:failed;
  const menus=navigation(viewer);
  const canCreate=menus.some(item=>item.key==="pengajuan/baru");
  const work=menus.filter(item=>item.states?.length&&isWorkItem(viewer.role,item));
  const pending=work.filter(item=>(queueCount(viewer,dashboard,item)??0)>0);
  const workReady=work.every(item=>queueCount(viewer,dashboard,item)!==null);
  const count=(states:string[])=>states.reduce((sum,state)=>sum+Number(summary?.byStatus[state]??0),0);
  const completed=count(["completed"]);
  const completion=summary?.total?Math.round(completed/summary.total*100):0;
  const metrics=summary?[
    {label:"Total pengajuan",value:summary.total,hint:hasPeriod?"Sesuai periode & filter":"Dalam cakupan akses Anda",icon:Files},
    {label:"Dalam proses",value:Object.entries(summary.byStatus).filter(([state])=>!finalStates.includes(state)).reduce((sum,[,value])=>sum+Number(value),0),hint:"Belum selesai atau ditutup",icon:CircleDashed},
    {label:"Siap diserahkan",value:count(["disbursed"]),hint:"Dana sudah berada di penyalur",icon:HandHeart},
    {label:"Bantuan selesai",value:count(["completed"]),hint:"Laporan penyerahan lengkap",icon:CheckCheck},
  ]:[];
  const stages=[
    {label:"Persiapan pengajuan",states:["draft","needs_data","screening"],color:"#8ca39b"},
    {label:"Persetujuan & survei",states:["review1","survey_assignment","survey_assigned","survey_submitted","review2","bypass_review"],color:"#be9752"},
    {label:"Proses dana",states:["approved","fund_ready","fund_submitted","fund_approved"],color:"#729483"},
    {label:"Penyaluran",states:["disbursed","delivery_failed"],color:"#5d9670"},
    {label:"Selesai",states:["completed"],color:"#2b7853"},
    {label:"Ditolak / dibatalkan / dana kembali",states:finalStates.filter(state=>state!=="completed"),color:"#b29a8a"},
  ];
  return <div className={s.page}>
    <header className={s.header}>
      <div className={s.welcome}><span className={s.eyebrow}>RINGKASAN BANTUAN</span><h1>Dashboard</h1><p>Halo, {viewer.name.split(" ")[0]}. Pantau pengajuan dan lanjutkan pekerjaan Anda dari sini.</p></div>
      <div className={s.headerActions}>
        <span className={s.workspaceRole}><span/>{bantuanRoles[viewer.role]}</span>
        <div>{canCreate&&<Link className={s.secondary} href={href("pengajuan/baru")}><Plus size={16}/>Pengajuan baru</Link>}<Link className={s.primary} href={href("proses")}>Pekerjaan saya<ArrowRight size={16}/></Link></div>
      </div>
    </header>
    <form className={ft.auxiliary} style={{padding:"0"}} key={JSON.stringify(period)} onSubmit={event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget)) as typeof period;if(values.from&&values.to&&values.from>values.to){setPeriodIssue("Tanggal akhir harus sama dengan atau setelah tanggal awal.");return;}setPeriod(values);setPeriodIssue("");}}><label>Dari tanggal pengajuan<input type="date" name="from" defaultValue={period.from}/></label><label>Sampai tanggal<input type="date" name="to" defaultValue={period.to}/></label><label>Program bantuan<select name="program" defaultValue={period.program}><option value="">Semua program</option>{[...new Set([...viewer.settings.programs,...Object.keys(dashboard?.byProgram??{})])].map(program=><option key={program}>{program}</option>)}</select></label><label>Sumber pengajuan<select name="source" defaultValue={period.source}><option value="">Semua sumber</option>{Object.entries(sourceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button type="submit">Terapkan filter</button>{hasPeriod&&<button type="button" onClick={()=>{setPeriod({from:"",to:"",program:"",source:""});setPeriodIssue("");}}>Reset</button>}</form>
    {periodIssue&&<p className={ft.error} role="alert">{periodIssue}</p>}
    {!summary?summaryFailed?<section className={s.empty} role="alert"><h2>Ringkasan belum berhasil dimuat</h2><p>Periksa koneksi lalu coba lagi.</p><button className={s.secondary} type="button" onClick={()=>hasPeriod?setRetry(value=>value+1):onRetry()}>Coba lagi</button></section>:<LoadingState variant="cards" label="Memuat ringkasan dashboard…"/>:<>
      <div className={s.metrics}>{metrics.map(metric=><section className={s.metric} key={metric.label}><div className={s.metricHeading}><span>{metric.label}</span><span className={s.metricIcon}><metric.icon size={20} strokeWidth={1.6}/></span></div><strong>{metric.value}</strong><small>{metric.hint}</small></section>)}</div>
      <div className={s.columns}>
        <section className={s.card}>
          <div className={s.cardHeader}><div><h2>Perkembangan pengajuan</h2><p>Posisi pengajuan pada setiap tahap.</p></div><Link href={href("pengajuan")}>Lihat semua<ArrowRight size={14}/></Link></div>
          <div className={s.progressBody}>
            <div className={s.completion}>
              <div className={s.ring} role="img" aria-label={`${completed} dari ${summary.total} pengajuan selesai, ${completion} persen`} style={{"--completion":`${completion}%`} as CSSProperties}><div><strong>{completion}%</strong><span>selesai</span></div></div>
              <p><strong>{completed}</strong> dari {summary.total} pengajuan<br/>telah selesai disalurkan</p>
            </div>
            <div className={s.stages}>{stages.map(stage=><div className={s.stage} key={stage.label} style={{"--stage-color":stage.color} as CSSProperties}><div><span>{stage.label}</span><strong>{count(stage.states)}</strong></div><div className={s.track}><span style={{width:`${summary.total?Math.min(100,count(stage.states)/summary.total*100):0}%`}}/></div></div>)}</div>
          </div>
          <p className={s.caption}>Ringkasan mengikuti filter tanggal pengajuan dan cakupan akses akun Anda.</p>
        </section>
        <section className={s.card}>
          <div className={s.cardHeader}><div><h2>Pekerjaan yang menunggu</h2><p>Antrean tugas Anda dari seluruh periode.</p></div><span className={s.workIcon}><ClipboardList size={20} strokeWidth={1.6}/></span></div>
          {pending.length?<div className={s.work}>{pending.slice(0,4).map(item=><Link href={href(item.key)} key={item.key}><span>{taskCopy[item.key]?.action??item.label}</span><strong>{queueCount(viewer,dashboard,item)}</strong><ArrowRight size={16}/></Link>)}</div>:<div className={s.clear}><span className={s.clearIcon}><Inbox size={27} strokeWidth={1.5}/></span><h3>{workReady?"Belum ada pekerjaan tertunda":"Lihat antrean pekerjaan Anda"}</h3><p>{workReady?"Pekerjaan baru akan tampil di sini saat memerlukan tindakan Anda.":"Buka pekerjaan saya untuk melihat tugas sesuai penugasan Anda."}</p></div>}
          <Link className={s.footerLink} href={href("proses")}>Buka pekerjaan saya<ArrowRight size={16}/></Link>
        </section>
      </div>
    </>}
  </div>;
}
