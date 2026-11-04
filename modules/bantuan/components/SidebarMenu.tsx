"use client";

import Link from "next/link";
import { canManageOwnPasswordInModule } from "../permissions";
import { useEffect, useRef } from "react";
import type { AidDashboard, BantuanViewer } from "@/contracts/modules/bantuan";
import { finalStates, href, navigation, sidebarNavigation, menuGroups, type NavEntry } from "../policy";
import { isWorkItem, queueCount } from "../workspace-guide";
import { Icon } from "./ui";
import s from "./SidebarMenu.module.css";

const shortCopy:Record<string,string>={"":"Ringkasan progres bantuan",pengajuan:"Cari dan pantau seluruh pengajuan",proses:"Prioritas sesuai tugas Anda",laporan:"Hasil dan nominal penyaluran",tim:"Kelola akun dan peran anggota",pengaturan:"Program dan aturan bantuan",audit:"Jejak aktivitas petugas",santunan:"Penerima, transfer, dan laporan",draft:"Belum dikirim ke penyetuju",screening:"Review data sebelum ke Approver","perlu-dilengkapi":"Perbaiki data yang dikembalikan","review-tahap-1":"Putuskan kelanjutan pengajuan","review-langsung":"Keputusan tanpa survei","penugasan-survei":"Pilih petugas kunjungan",survei:"Kunjungan dan hasil survei","review-tahap-2":"Tinjau survei dan nominal","review-ulang":"Periksa kembali keputusan","penugasan-penyalur":"Pilih penyerah bantuan","dana-siap":"Siapkan pengajuan dana","dana-diajukan":"Catat hasil keputusan atasan",pencairan:"Dana disetujui, catat transfer",penyaluran:"Serahkan dan lengkapi bukti","gagal-salur":"Tindak lanjuti pengembalian",selesai:"Penyerahan telah lengkap",ditolak:"Lihat alasan penolakan",dibatalkan:"Pengajuan yang tidak dilanjutkan","dana-kembali":"Catatan pengembalian dana"};

export function SidebarMenu({viewer,dashboard,activeKey,onNavigate}:{viewer:BantuanViewer;dashboard:AidDashboard|null;activeKey:string;onNavigate:()=>void}){
  const ref=useRef<HTMLElement>(null),entries=sidebarNavigation(viewer);
  useEffect(()=>{const nav=ref.current,active=nav?.querySelector<HTMLElement>('[aria-current="page"]');if(nav&&active)nav.scrollTop=Math.max(0,active.offsetTop-(nav.clientHeight-active.clientHeight)/2);},[activeKey]);
  const primary=entries.filter(item=>item.group==="Umum"),secondary=entries.filter(item=>["Laporan","Pengelolaan"].includes(item.group));
  const groups=menuGroups.map(group=>({...group,entries:navigation(viewer).filter(item=>item.group===group.group)})).filter(group=>group.entries.length);
  const allWork=navigation(viewer).filter(item=>item.states?.length&&isWorkItem(viewer,item));
  function count(items:NavEntry[]){const counts=items.map(item=>queueCount(viewer,dashboard,item));return counts.some(value=>value===null)?null:counts.reduce<number>((sum,value)=>sum+(value??0),0);}
  function item(entry:NavEntry,child=false){const total=entry.states?queueCount(viewer,dashboard,entry):entry.key==="berjalan"?(dashboard?Object.entries(dashboard.byStatus).reduce((sum,[status,total])=>sum+(status!=="draft"&&!finalStates.includes(status)?Number(total):0),0):null):entry.key==="pengajuan"?dashboard?.total:entry.key==="proses"?count(allWork):undefined;return <Link href={href(entry.key)} key={entry.key} className={`${s.item} ${child?s.child:""}`} data-active={activeKey===entry.key} aria-current={activeKey===entry.key?"page":undefined} onClick={onNavigate} title={entry.description??shortCopy[entry.key]}><Icon name={entry.icon}/><span className={s.copy}><strong>{entry.label}</strong><small>{shortCopy[entry.key]??entry.description}</small></span>{total!==undefined&&<span className={s.count} aria-label={total===null?"Jumlah belum dimuat":`${total} pengajuan`}>{total??"—"}</span>}</Link>;}
  return <nav ref={ref} className={s.nav} aria-label="Navigasi modul">
    <div className={s.primary}>{primary.map(entry=>item(entry))}</div>
    {groups.length>0&&<div className={s.sectionLabel}>TAHAP BANTUAN</div>}
    {groups.map(group=><Link key={group.key} href={href(group.key)} className={s.item} data-active={activeKey===group.key||group.entries.some(entry=>entry.key===activeKey)} aria-current={activeKey===group.key?"page":undefined} onClick={onNavigate}><Icon name={group.icon}/><span className={s.copy}><strong>{group.label}</strong><small>{group.description}</small></span><span className={s.count} title="Jumlah menu">{group.entries.length}</span></Link>)}
    {secondary.map((entry,index)=><div key={entry.key}>{secondary[index-1]?.group!==entry.group&&<div className={s.sectionLabel}>{entry.group}</div>}{item(entry)}</div>)}
    {canManageOwnPasswordInModule(viewer)&&<><div className={s.sectionLabel}>AKUN</div>
    <Link href="/admin/bantuan/akun" className={s.item} data-active={activeKey==="akun"} aria-current={activeKey==="akun"?"page":undefined} onClick={onNavigate}><Icon name="shield"/><span className={s.copy}><strong>Pengaturan akun</strong><small>Kelola password dan keamanan akun</small></span></Link></>}
  </nav>;
}
