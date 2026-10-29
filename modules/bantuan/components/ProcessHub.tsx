"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus, CheckCheck, ChevronDown, BookOpen, FileText, Clock3, ClipboardList, Search, RotateCcw } from "lucide-react";
import { bantuanRoles, type AidDashboard, type BantuanViewer } from "@/contracts/modules/bantuan";
import { href, navigation, type NavEntry } from "../policy";
import { isWorkItem, queueCount, roleSteps, taskCopy } from "../workspace-guide";
import { Icon } from "./ui";
import { LoadingState } from "./LoadingState";
import s from "./ProcessHub.module.css";

export function ProcessHub({viewer,dashboard,title="Pekerjaan saya",failed=false,onRetry}:{viewer:BantuanViewer;dashboard:AidDashboard|null;title?:string;failed?:boolean;onRetry?:()=>void}){
  const [search,setSearch]=useState(""),[group,setGroup]=useState(""),[mode,setMode]=useState("pending");
  const menus=navigation(viewer),items=menus.filter(item=>item.states?.length);
  const work=items.filter(item=>isWorkItem(viewer.role,item));
  const matches=(item:NavEntry)=>(!group||item.group===group)&&[item.label,item.description,taskCopy[item.key]?.title].join(" ").toLowerCase().includes(search.trim().toLowerCase());
  const pending=work.filter(item=>(mode==="all"||queueCount(viewer,dashboard,item)!==0)&&matches(item));
  const monitoring=items.filter(item=>!isWorkItem(viewer.role,item)&&!item.group.includes("Arsip")&&(mode==="all"||queueCount(viewer,dashboard,item)!==0)&&matches(item));
  const archives=items.filter(item=>item.group.includes("Arsip")&&matches(item));
  const canCreate=menus.some(item=>item.key==="pengajuan/baru");
  const canDirect=menus.some(item=>item.key==="pengajuan/langsung");
  const total=work.reduce((sum,item)=>sum+(queueCount(viewer,dashboard,item)??0),0);
  const filteredCounts=pending.map(item=>queueCount(viewer,dashboard,item));
  const pendingTotal=dashboard&&filteredCounts.every(count=>count!==null)?filteredCounts.reduce<number>((sum,count)=>sum+(count??0),0):null;
  const otherWork=work.filter(item=>matches(item)&&!pending.some(visible=>visible.key===item.key));
  const hasFilters=!!search||!!group||mode!=="pending";
  function row(item:NavEntry,compact=false){
    const count=queueCount(viewer,dashboard,item),copy=taskCopy[item.key];
    return <Link className={`${s.task} ${compact?"":s.priorityTask}`} href={href(item.key)} key={item.key}>
      <span className={s.taskIcon}><Icon name={item.icon}/></span>
      <span className={s.taskBody}><strong>{compact?item.label:copy?.title??item.label}</strong><small>{compact?item.description:copy?.description??item.description}</small></span>
      <span className={s.taskEnd}><span className={s.taskCount}><b>{count===null?"…":count}</b><small>pengajuan</small></span><span className={s.taskAction}>{compact?"Lihat daftar":copy?.action??"Tinjau pengajuan"}<ArrowRight size={16}/></span></span>
    </Link>;
  }
  return <div className={s.page}>
    <header className={s.header}><div><span className={s.eyebrow}>PENGAJUAN BANTUAN</span><h1>{title}</h1><p>Mulai pengajuan baru atau lanjutkan pekerjaan yang perlu Anda tangani.</p></div><span className={s.role}>Peran aktif · {bantuanRoles[viewer.role]}</span></header>
    <section className={s.welcome}>
      <div className={s.start}><span className={s.startIcon}>{canCreate?<Plus size={24}/>:<CheckCheck size={24}/>}</span><div><h2>{canCreate?"Ada pemohon yang ingin mengajukan bantuan?":total?"Ada pekerjaan yang menunggu Anda":"Mulai dari tugas yang diberikan kepada Anda"}</h2><p>{canCreate?"Isi data pemohon dalam empat langkah. Bisa disimpan dulu dan dilanjutkan kapan saja.":"Daftar di bawah mengikuti peran aktif dan cakupan akses Anda."}</p><div className={s.startActions}>{canCreate?<Link className={s.primary} href={href("pengajuan/baru")}>Buat pengajuan baru<ArrowRight size={17}/></Link>:pending[0]&&dashboard?<Link className={s.primary} href={href(pending[0].key)}>Buka pekerjaan pertama<ArrowRight size={17}/></Link>:<Link className={s.secondary} href={href("pengajuan")}>Lihat pengajuan</Link>}{canCreate&&(dashboard?.byStatus.draft??0)>0&&<Link className={s.textLink} href={href("draft")}>Lanjutkan draft ({dashboard?.byStatus.draft})</Link>}</div></div></div>
      <details className={s.guide}><summary><BookOpen size={16}/>Cara kerja Anda<ChevronDown size={14}/></summary><ol>{roleSteps(viewer.role).map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol></details>
    </section>
    <div className={s.filters} aria-label="Filter pekerjaan">
      <label className={s.searchField}><span>Cari pekerjaan</span><span className={s.searchInput}><Search size={18} aria-hidden="true"/><input type="search" aria-label="Cari tahap pekerjaan" placeholder="Cari tugas atau tahap bantuan…" value={search} onChange={e=>setSearch(e.target.value)}/></span></label>
      <label className={s.filterField}><span>Tahap proses</span><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Semua tahap</option>{[...new Set(items.map(item=>item.group))].map(value=><option key={value}>{value}</option>)}</select></label>
      <label className={s.filterField}><span>Tampilkan antrean</span><select value={mode} onChange={e=>setMode(e.target.value)}><option value="pending">Perlu ditangani</option><option value="all">Semua antrean</option></select></label>
      <button className={s.resetFilter} type="button" disabled={!hasFilters} onClick={()=>{setSearch("");setGroup("");setMode("pending");}}><RotateCcw size={15} aria-hidden="true"/>Reset</button>
    </div>
    <div className={s.columns}><section className={`${s.section} ${s.workPanel}`} aria-label="Pekerjaan yang perlu ditangani"><div className={`${s.sectionHeading} ${s.workHeading}`}><div className={s.workTitle}><span className={s.workIcon}><ClipboardList size={22} aria-hidden="true"/></span><div><h2>Perlu Anda kerjakan</h2><p>Pilih tugas di bawah untuk membuka daftar pengajuannya.</p></div></div>{pendingTotal!==null&&<span className={s.pendingBadge}><b>{pendingTotal}</b><span>pengajuan <br/>perlu ditangani</span></span>}</div>
      {!dashboard?failed?<div className={s.clear}><h3>Pekerjaan belum berhasil dimuat</h3><p>Data belum dapat ditampilkan. Periksa koneksi lalu coba lagi.</p><button type="button" className={s.secondary} onClick={onRetry}>Coba lagi</button></div>:<LoadingState label="Memuat pekerjaan Anda…"/>:pending.length?<div className={s.tasks}>{pending.map(item=>row(item))}</div>:<div className={s.clear}><span><CheckCheck size={26}/></span><h3>{search||group?"Tidak ada tahap yang cocok":"Tidak ada pekerjaan tertunda"}</h3><p>{search||group?"Ubah pencarian atau filter tahap untuk melihat pekerjaan lainnya.":canCreate?"Anda bisa membuat pengajuan baru. Tugas berikutnya akan muncul di sini saat membutuhkan tindakan Anda.":"Tugas akan muncul di sini saat ada pengajuan yang perlu Anda tangani."}</p></div>}
      {dashboard&&otherWork.length>0&&<details className={s.other}><summary><span>Lihat tahap kerja lainnya <small>{otherWork.length} tahap</small></span><ChevronDown size={16}/></summary><div className={s.tasks}>{otherWork.map(item=>row(item,true))}</div></details>}
    </section>
    <aside className={s.side}><section className={s.monitor}><h2><Clock3 size={17}/>Pantau proses berikutnya</h2><p>Bagian ini membantu Anda memantau pekerjaan yang sedang ditangani petugas lain.</p>{dashboard&&monitoring.length?monitoring.map(item=>row(item,true)):<span className={s.quiet}>{dashboard?"Belum ada proses lain yang perlu dipantau.":failed?"Status belum dapat dimuat.":"Memuat status…"}</span>}</section>
    {canDirect&&<details className={s.special}><summary>Pengajuan jalur langsung<ChevronDown size={16}/></summary><p>Untuk kasus khusus yang memiliki izin jalur langsung. Pengajuan masuk ke penyetuju tanpa screening dan survei.</p><Link className={s.textLink} href={href("pengajuan/langsung")}>Buat pengajuan jalur langsung<ArrowRight size={14}/></Link></details>}
    {menus.some(item=>item.key==="santunan")&&<Link className={s.santunan} href={href("santunan")}><Icon name="hand"/><span><strong>Santunan rutin & tidak rutin</strong><small>Catat santunan dan laporan penyalurannya.</small></span><ArrowRight size={17}/></Link>}
    </aside></div>
    {archives.length>0&&<details className={s.archive}><summary><FileText size={18}/><span><strong>Arsip & riwayat pengajuan</strong><small>Cari bantuan selesai, ditolak, atau dibatalkan.</small></span><ChevronDown size={18}/></summary><div className={s.archiveGrid}>{archives.map(item=>row(item,true))}</div></details>}
  </div>;
}
