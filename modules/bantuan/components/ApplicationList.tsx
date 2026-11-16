"use client";

import Link from "./WorkspaceNavigation";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, UserRound, Wallet, MapPin } from "lucide-react";
import type { AidApplication, AidPage, BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { day, money } from "../api/client";
import { hasAnyRole } from "../permissions";
import { nextStep } from "../policy";
import { sourceLabels } from "../list-filters";
import { Badge } from "./ui";
import { BulkReminder } from "./BulkReminder";
import { ApplicationReminder } from "./ApplicationReminder";
import s from "./ApplicationList.module.css";
import shared from "./Workspace.module.css";

export function ApplicationList({viewer,page,staff,view,selected,onSelect,selectable,canSelect,refreshing,number,onPageChange,perPage,onPerPageChange}:{viewer:BantuanViewer;page:AidPage;staff:BantuanStaff[];view:"cards"|"table";selected:Record<string,boolean>;onSelect:(id:string,value:boolean)=>void;selectable:boolean;canSelect:(row:AidApplication)=>boolean;refreshing:boolean;number:number;onPageChange:(page:number)=>void;perPage:string;onPerPageChange:(value:string)=>void}){
  const origin=usePathname().replace(/^\/admin\/bantuan\/?/,"");
  const detailHref=(id:string)=>`/admin/bantuan/pengajuan/${id}?from=${encodeURIComponent(origin)}`;
  const canHandover=(row:AidApplication)=>row.status==="disbursed"&&(hasAnyRole(viewer,["admin"])||(hasAnyRole(viewer,["verifier"])&&row.distributionType==="verifier"&&row.distributorId===viewer.id)||(hasAnyRole(viewer,["treasurer"])&&row.distributionType==="direct"));
  const names=Object.fromEntries(staff.map(person=>[person.id,person.name]));
  const person=(id:string|null)=>id?names[id]??"Petugas tidak tersedia":"Belum ditugaskan";
  const location=(row:AidApplication)=>row.shortLocation?.trim()||row.region?.trim()||"Lokasi belum diisi";
  const creator=(row:AidApplication)=>row.createdBy===viewer.id?viewer.name:names[row.createdBy]??"Akun tidak tersedia";
  const distributor=(row:AidApplication)=>row.manualDistributorName??(row.distributionType==="direct"?"Bendahara langsung":person(row.distributorId));
  const checkbox=(row:AidApplication)=><input className={shared.check} type="checkbox" aria-label={`Pilih ${row.number}`} title={canSelect(row)?"Pilih untuk tindakan massal":"Status ini tidak mendukung tindakan massal"} disabled={refreshing||!canSelect(row)} checked={!!selected[row.id]} onChange={event=>onSelect(row.id,event.target.checked)}/>;
  const first=(page.current_page-1)*(page.per_page??Number(perPage))+1;
  return <div aria-busy={refreshing}>
    <BulkReminder rows={page.data} viewer={viewer} refreshing={refreshing}/>
    {view==="cards"?<div className={s.grid}>{page.data.map(row=>{const step=nextStep(row.status,row.source);return <article className={`${s.application} ${selected[row.id]?s.selected:""}`} key={row.id}>
      <div className={s.cardTop}><Badge status={row.status}/>{selectable&&checkbox(row)}</div>
      <div className={s.identity}><p>{row.number}</p><h3><Link href={detailHref(row.id)}>{row.name}</Link></h3><span>{row.program}</span></div>
      <div className={s.amount}><span><Wallet size={15}/>Nominal bantuan</span><strong>{row.amount!==null?money(row.amount):"Belum ditetapkan"}</strong></div>
      <dl className={s.information}><div className={s.region}><dt><UserRound size={13}/>Dibuat oleh</dt><dd>{creator(row)}</dd></div><div><dt><UserRound size={13}/>Verifikator</dt><dd>{row.manualVerifierName??person(row.verifierId)}</dd></div><div><dt><UserRound size={13}/>Penyalur</dt><dd>{distributor(row)}</dd></div><div><dt><CalendarDays size={13}/>Tanggal pengajuan</dt><dd>{day(row.createdAt)}</dd></div><div><dt>Sumber pengajuan</dt><dd>{sourceLabels[row.source]??row.source}</dd></div><div className={s.region}><dt><MapPin size={13}/>Lokasi pemohon</dt><dd className={s.cardLocation} title={location(row)}>{location(row)}</dd></div></dl>
      {row.status.startsWith("rejected")&&<div className={s.rejection}><strong>Alasan ditolak</strong><p>{row.rejectionReason?.trim()||"Alasan penolakan belum dicatat."}</p></div>}
      <div className={s.next}><span>{step.owner}</span><p>{step.title}</p></div>
      <div className={s.cardActions}>{row.status==="completed"&&<Link className={`${s.open} ${s.primaryAction}`} href={`${detailHref(row.id)}&action=report`}>Lihat laporan penyerahan<ArrowRight size={16}/></Link>}{canHandover(row)?<><Link className={s.open} href={`${detailHref(row.id)}&action=certificate`}>Generate sertifikat<ArrowRight size={16}/></Link><Link className={`${s.open} ${s.primaryAction}`} href={`${detailHref(row.id)}&action=handover`}>Laporkan penyerahan<ArrowRight size={16}/></Link></>: <Link className={s.open} href={detailHref(row.id)} aria-label={`Buka pengajuan ${row.name}, ${row.number}`}>Buka pengajuan<ArrowRight size={16}/></Link>}</div>
      <ApplicationReminder row={row} viewer={viewer}/>
    </article>;})}</div>:<div className={`${shared.tableWrap} ${s.tableScroll}`} role="region" aria-label="Daftar pengajuan, geser ke samping untuk melihat semua kolom" tabIndex={0}><table className={`${shared.table} ${s.applicationTable} ${selectable?s.withSelection:""}`}><caption className={s.tableHint}>Geser tabel ke samping untuk melihat semua kolom.</caption><colgroup>{selectable&&<col className={s.selectionColumn}/>}<col className={s.applicantColumn}/>{Array.from({length:6},(_,index)=><col key={index} className={s.dataColumn}/>)}<col className={s.actionColumn}/></colgroup><thead><tr>{selectable&&<th aria-label="Pilih pengajuan"/>}<th>Pemohon</th><th>Dibuat oleh</th><th>Program / sumber</th><th>Status</th><th>Nominal bantuan</th><th>Verifikator / penyalur</th><th>Tanggal</th><th className={shared.stickyAction}>Aksi</th></tr></thead><tbody>{page.data.map(row=><tr key={row.id}>{selectable&&<td>{checkbox(row)}</td>}<td><Link className={shared.applicantLink} href={detailHref(row.id)}><strong>{row.name}</strong></Link><small>{row.number}</small><span className={s.tableLocation} title={location(row)}><MapPin size={12}/><span>{location(row)}</span></span></td><td title={creator(row)}>{creator(row)}</td><td title={row.program}>{row.program}<small>{sourceLabels[row.source]??row.source}</small></td><td><Badge status={row.status}/></td><td>{row.amount!==null?money(row.amount):<span className={shared.tiny}>Belum ditetapkan</span>}</td><td title={`${row.manualVerifierName??person(row.verifierId)} · Penyalur: ${distributor(row)}`}>{row.manualVerifierName??person(row.verifierId)}<small>Penyalur: {distributor(row)}</small></td><td>{day(row.createdAt)}</td><td className={shared.stickyAction}><div className={s.tableActions}><Link className={shared.detailButton} href={row.status==="completed"?`${detailHref(row.id)}&action=report`:detailHref(row.id)}>{row.status==="completed"?"Lihat laporan penyerahan":"Buka pengajuan"}<ArrowRight size={14}/></Link><ApplicationReminder row={row} viewer={viewer}/></div></td></tr>)}</tbody></table></div>}
    <div className={s.pagination}><div><strong>Menampilkan {first}–{first+page.data.length-1} dari {page.total} pengajuan</strong><span>Halaman {page.current_page} dari {page.last_page}</span></div><div className={s.pageControls}><label>Per halaman<select aria-label="Jumlah pengajuan per halaman" value={perPage} disabled={refreshing} onChange={event=>onPerPageChange(event.target.value)}>{[12,24,48].map(size=><option key={size} value={size}>{size}</option>)}</select></label><button type="button" disabled={refreshing||number<=1} onClick={()=>onPageChange(number-1)}>← Sebelumnya</button><button type="button" disabled={refreshing||number>=page.last_page} onClick={()=>onPageChange(number+1)}>Berikutnya →</button></div></div>
  </div>;
}
