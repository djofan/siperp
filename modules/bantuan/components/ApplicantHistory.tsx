"use client";
import Link from "next/link";
import type { AidApplicantHistory } from "@/contracts/modules/bantuan";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { day, money } from "../api/client";
import s from "./Workspace.module.css";

export function ApplicantHistory({count,applications}:{count:number;applications:AidApplicantHistory[]}){
  if(!count)return null;
  return <section className={s.applicantHistory} aria-label="Riwayat pengajuan pemohon">
    <div className={s.applicantHistoryHeading}><div><h3>Pemohon pernah mengajukan bantuan</h3><p>{count} catatan pengajuan lain dengan NIK yang sama. Pengajuan baru tetap dapat dilanjutkan.</p></div></div>
    {applications.length>0&&<div className={s.applicantHistoryList}>{applications.map(item=><Link key={item.id} href={"/admin/bantuan/pengajuan/"+item.id} target="_blank" rel="noreferrer" className={s.applicantHistoryItem} aria-label={"Lihat pengajuan "+item.number}>
      <div><strong>{item.program}</strong><small>{item.number} · {day(item.createdAt)}</small></div>
      <span className={s.badge}>{bantuanStatuses[item.status]??item.status}</span><span>{item.amount===null?"Nominal belum ditetapkan":money(item.amount)}</span><span aria-hidden="true">↗</span>
    </Link>)}</div>}
    <small>Catatan termasuk draft, pengajuan ditolak, dan bantuan selesai; bukan berarti semuanya sudah menerima bantuan.{applications.length<count?" Rincian yang ditampilkan hanya pengajuan sesuai akses akun Anda.":" Klik pengajuan untuk melihat detailnya di tab baru."}</small>
  </section>;
}
