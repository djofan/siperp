"use client";
import { History, CircleCheck, ArrowUpRight } from "lucide-react";
import Link from "./WorkspaceNavigation";
import type { AidApplicantHistory } from "@/contracts/modules/bantuan";
import { bantuanStatuses, bantuanRoles } from "@/contracts/modules/bantuan";
import { day, money } from "../api/client";
import s from "./Workspace.module.css";
const sources: Record<string,string> = { online:"Online / WhatsApp", walk_in:"Datang ke kantor", bypass:"Pengajuan langsung" };
function created(value:string) { const date=new Date(value); return Number.isNaN(date.getTime())?"Tanggal tidak tersedia":date.toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta"})+" WIB"; }
export function ApplicantHistory({count,applications}:{count:number;applications:AidApplicantHistory[]}) {
  if(!count)return null;
  const helped=applications.filter(item=>item.status==="completed").length;
  return <section className={`${s.applicantHistory} ${helped?s.historyHelped:s.historyPrevious}`} aria-label="Riwayat pengajuan pemohon">
    <div className={s.applicantHistoryHeading}><span className={s.historyIcon}>{helped?<CircleCheck size={24} aria-hidden="true"/>:<History size={24} aria-hidden="true"/>}</span><div><h3>{helped?"Perhatian: pemohon sudah pernah menerima bantuan":"Perhatian: pemohon memiliki riwayat pengajuan"}</h3><p>{count} pengajuan lain dengan NIK yang sama.{helped>0?` ${helped} pengajuan tercatat selesai.`:" Periksa status dan hasil pengajuan sebelumnya."} Pengajuan baru tetap dapat dilanjutkan.</p></div></div>
    {applications.length>0&&<div className={s.applicantHistoryList}>{applications.map(item=><Link key={item.id} href={"/admin/bantuan/pengajuan/"+item.id} target="_blank" rel="noreferrer" className={s.applicantHistoryItem} aria-label={"Lihat pengajuan "+item.number}>
      <div className={s.historyCardTop}><div><strong>{item.program}</strong><small>{item.number}</small></div><span className={s.badge}>{bantuanStatuses[item.status]??item.status}</span><ArrowUpRight size={18} aria-hidden="true"/></div>
      <dl className={s.historyFacts}>
        <div><dt>Pengajuan dibuat</dt><dd>{created(item.createdAt)}</dd></div>
        <div><dt>Dibuat oleh</dt><dd>{item.createdByName||"Petugas tidak tercatat"}{item.intakeRole&&<small>{bantuanRoles[item.intakeRole]??item.intakeRole}</small>}</dd></div>
        <div><dt>Sumber pengajuan</dt><dd>{sources[item.source??""]??"Belum tercatat"}</dd></div>
        <div><dt>{item.handedOverAmount!=null?"Nominal diserahkan":"Nominal bantuan disetujui"}</dt><dd>{item.handedOverAmount!=null?money(item.handedOverAmount):item.amount===null?"Belum ditetapkan":money(item.amount)}</dd></div>
        <div className={s.historyDelivery}><dt>Tanggal penyerahan bantuan</dt><dd>{item.handedOverAt?day(item.handedOverAt):item.status==="completed"?"Tanggal penyerahan belum tercatat":"Belum ada laporan penyerahan"}</dd></div>
        <div><dt>Dana dicairkan</dt><dd>{item.disbursedAt?day(item.disbursedAt):"Belum tercatat"}</dd></div>
        {item.completedAt&&<div><dt>Pengajuan selesai</dt><dd>{day(item.completedAt)}</dd></div>}
      </dl>
      <span className={s.historyCardFoot}>{item.status==="completed"?"Bantuan tercatat selesai":"Masih berupa riwayat pengajuan; belum tercatat selesai"}<b>Lihat detail ↗</b></span>
    </Link>)}</div>}
    <small>Riwayat mencakup draft, penolakan, pembatalan, dan bantuan selesai. Tanggal pencairan berbeda dengan tanggal penyerahan kepada penerima.{applications.length<count?" Sebagian rincian tidak ditampilkan sesuai akses akun Anda.":" Buka detail untuk melihat laporan dan bukti penyerahan."}</small>
  </section>;
}
