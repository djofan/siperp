"use client";

import Link from "next/link";
import type { AidDashboard, BantuanViewer } from "@/contracts/modules/bantuan";
import { href, navigation } from "../policy";
import { Icon } from "./ui";
import s from "./Workspace.module.css";

export function ProcessHub({viewer,dashboard}:{viewer:BantuanViewer;dashboard:AidDashboard|null}){
  const items=navigation(viewer).filter(item=>item.states?.length);
  const groups=[...new Set(items.map(item=>item.group))];
  const create=navigation(viewer).filter(item=>["pengajuan/baru","pengajuan/langsung"].includes(item.key));
  return <>
    <div className={s.heading}><div><div className={s.eyebrow}>RUANG KERJA</div><h1>Proses bantuan</h1><p>Pilih tahap yang ingin dikerjakan. Antrean ditampilkan sesuai peran dan penugasan Anda.</p></div><div className={s.actions}>{create.map((item,i)=><Link key={item.key} className={`${s.button} ${i?s.secondary:""}`} href={href(item.key)}><Icon name="plus"/>{item.label}</Link>)}</div></div>
    <div className={s.processGrid}>{groups.map(group=><section className={s.processCard} key={group}>
      <div className={s.processCardHeading}><span>{group.split(" · ")[0]}</span><h2>{group.split(" · ")[1]??group}</h2></div>
      <div className={s.processLinks}>{items.filter(item=>item.group===group).map(item=>{
        const showCount=dashboard&&!(viewer.role==="verifier"&&item.task);
        const count=item.states?.reduce((sum,state)=>sum+Number(dashboard?.byStatus[state]??0),0)??0;
        return <Link key={item.key} href={href(item.key)} className={s.processLink} title={item.description}><Icon name={item.icon}/><span>{item.label}</span>{showCount&&<small>{count}</small>}<Icon name="arrow"/></Link>;
      })}</div>
    </section>)}{navigation(viewer).some(item=>item.key==="santunan")&&<section className={s.processCard}><div className={s.processCardHeading}><span>07</span><h2>Santunan</h2></div><div className={s.processLinks}><Link href={href("santunan")} className={s.processLink}><Icon name="hand"/><span>Santunan rutin & tidak rutin</span><Icon name="arrow"/></Link></div></section>}</div>
    <p className={s.processHint}><Icon name="shield"/>Memilih tahap hanya membuka antreannya. Tidak mengubah status atau melakukan transfer.</p>
  </>;
}
