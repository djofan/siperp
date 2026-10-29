"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { AidDashboard, BantuanViewer } from "@/contracts/modules/bantuan";
import { href, navigation, sidebarNavigation, type NavEntry } from "../policy";
import { isWorkItem, queueCount } from "../workspace-guide";
import { Icon } from "./ui";
import s from "./SidebarMenu.module.css";

const shortCopy:Record<string,string>={"":"Ringkasan progres bantuan",pengajuan:"Cari dan pantau seluruh pengajuan",proses:"Prioritas sesuai tugas Anda",laporan:"Hasil dan nominal penyaluran",tim:"Kelola akun dan peran anggota",pengaturan:"Program dan aturan bantuan",audit:"Jejak aktivitas petugas",santunan:"Penerima, transfer, dan laporan",draft:"Belum dikirim ke penyetuju",screening:"Periksa pengajuan ke kantor","perlu-dilengkapi":"Perbaiki data yang dikembalikan","review-tahap-1":"Putuskan kelanjutan pengajuan","review-langsung":"Keputusan tanpa survei","penugasan-survei":"Pilih petugas kunjungan",survei:"Kunjungan dan hasil survei","review-tahap-2":"Tinjau survei dan nominal","review-ulang":"Periksa kembali keputusan","penugasan-penyalur":"Pilih penyerah bantuan","dana-siap":"Siapkan pengajuan dana","dana-diajukan":"Catat hasil keputusan atasan",pencairan:"Dana disetujui, catat transfer",penyaluran:"Serahkan dan lengkapi bukti","gagal-salur":"Tindak lanjuti pengembalian",selesai:"Penyerahan telah lengkap",ditolak:"Lihat alasan penolakan",dibatalkan:"Pengajuan yang tidak dilanjutkan","dana-kembali":"Catatan pengembalian dana"};
const groupCopy:Record<string,{title:string;description:string;icon:string}>={"01 · Pengajuan":{title:"Penerimaan pengajuan",description:"Draft, screening & kelengkapan",icon:"file"},"02 · Persetujuan":{title:"Persetujuan",description:"Tinjau dan putuskan pengajuan",icon:"check"},"03 · Survei":{title:"Survei & hasil kunjungan",description:"Penugasan, kunjungan & review",icon:"clipboard"},"04 · Dana bantuan":{title:"Proses dana bantuan",description:"Penyalur dan pengajuan dana",icon:"wallet"},"05 · Pencairan & penyerahan":{title:"Pencairan & penyaluran",description:"Transfer, penyerahan & bukti",icon:"hand"},"06 · Arsip":{title:"Arsip pengajuan",description:"Selesai, ditolak & dibatalkan",icon:"history"}};

export function SidebarMenu({viewer,dashboard,activeKey,onNavigate}:{viewer:BantuanViewer;dashboard:AidDashboard|null;activeKey:string;onNavigate:()=>void}){
  const ref=useRef<HTMLElement>(null),entries=sidebarNavigation(viewer);
  useEffect(()=>{const nav=ref.current,active=nav?.querySelector<HTMLElement>('[aria-current="page"]');if(nav&&active)nav.scrollTop=Math.max(0,active.offsetTop-(nav.clientHeight-active.clientHeight)/2);},[activeKey]);
  const primary=entries.filter(item=>item.group==="Umum"),secondary=entries.filter(item=>["Laporan","Pengelolaan"].includes(item.group));
  const groups=Object.entries(groupCopy).map(([key,info])=>({key,...info,entries:entries.filter(item=>item.group===key)})).filter(group=>group.entries.length);
  const allWork=navigation(viewer).filter(item=>item.states?.length&&isWorkItem(viewer.role,item));
  function count(items:NavEntry[]){const counts=items.map(item=>queueCount(viewer,dashboard,item));return counts.some(value=>value===null)?null:counts.reduce<number>((sum,value)=>sum+(value??0),0);}
  function item(entry:NavEntry,child=false){const total=entry.states?queueCount(viewer,dashboard,entry):entry.key==="pengajuan"?dashboard?.total:entry.key==="proses"?count(allWork):undefined;return <Link href={href(entry.key)} key={entry.key} className={`${s.item} ${child?s.child:""}`} data-active={activeKey===entry.key} aria-current={activeKey===entry.key?"page":undefined} onClick={onNavigate} title={entry.description??shortCopy[entry.key]}><Icon name={entry.icon}/><span className={s.copy}><strong>{entry.label}</strong><small>{shortCopy[entry.key]??entry.description}</small></span>{total!==undefined&&<span className={s.count} aria-label={total===null?"Jumlah belum dimuat":`${total} pengajuan`}>{total??"—"}</span>}</Link>;}
  return <nav ref={ref} className={s.nav} aria-label="Navigasi modul">
    <div className={s.primary}>{primary.map(entry=>item(entry))}</div>
    {groups.length>0&&<div className={s.sectionLabel}>TAHAP BANTUAN</div>}
    {groups.map(group=>{if(group.entries.length===1)return item(group.entries[0]);const total=count(group.entries);return <details className={s.group} key={group.key} open={group.entries.some(entry=>entry.key===activeKey)||undefined}><summary><Icon name={group.icon}/><span className={s.copy}><strong>{group.title}</strong><small>{group.description}</small></span><span className={s.count} aria-label={total===null?"Jumlah belum dimuat":`${total} pengajuan`}>{total??"—"}</span><ChevronDown className={s.chevron} size={13}/></summary><div className={s.children}>{group.entries.map(entry=>item(entry,true))}</div></details>;})}
    {secondary.map((entry,index)=><div key={entry.key}>{secondary[index-1]?.group!==entry.group&&<div className={s.sectionLabel}>{entry.group}</div>}{item(entry)}</div>)}
  </nav>;
}
