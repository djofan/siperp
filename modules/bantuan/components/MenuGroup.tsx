"use client";

import Link from "next/link";
import type { AidDashboard, BantuanViewer } from "@/contracts/modules/bantuan";
import { href, menuGroups, navigation } from "../policy";
import { queueCount } from "../workspace-guide";
import { Icon } from "./ui";
import s from "./MenuGroup.module.css";

export function MenuGroup({view,viewer,dashboard}:{view:string;viewer:BantuanViewer;dashboard:AidDashboard|null}) {
  const group=menuGroups.find(item=>item.key===view);
  if(!group)return null;
  const entries=navigation(viewer).filter(item=>item.group===group.group);
  return <section className={s.page}>
    <header><span className={s.eyebrow}>TAHAP BANTUAN</span><h1>{group.label}</h1><p>{group.description} Pilih kartu untuk membuka daftar atau memulai proses.</p></header>
    <div className={s.grid}>{entries.map(entry=>{
      const count=entry.states?queueCount(viewer,dashboard,entry):undefined;
      return <Link key={entry.key} href={href(entry.key)} className={s.card}>
        <div className={s.top}><span className={s.icon}><Icon name={entry.icon}/></span>{count!==undefined&&<span className={s.count}>{count===null?"Memuat jumlah…":`${count} pengajuan`}</span>}</div>
        <h2>{entry.label}</h2><p>{entry.description??"Isi data pemohon dan kelengkapan untuk membuat pengajuan bantuan."}</p>
        <span className={s.action}>{entry.states?"Lihat pengajuan":"Mulai pengajuan"}<Icon name="arrow"/></span>
      </Link>;
    })}</div>
  </section>;
}
