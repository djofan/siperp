"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, UserRound, Wallet, MapPin } from "lucide-react";
import type { AidApplication, AidPage, BantuanStaff } from "@/contracts/modules/bantuan";
import { day, money } from "../api/client";
import { nextStep } from "../policy";
import { sourceLabels } from "../list-filters";
import { Badge } from "./ui";
import s from "./ApplicationList.module.css";
import shared from "./Workspace.module.css";

export function ApplicationList({page,staff,view,selected,onSelect,selectable,canSelect,refreshing,number,onPageChange,perPage,onPerPageChange}:{page:AidPage;staff:BantuanStaff[];view:"cards"|"table";selected:Record<string,boolean>;onSelect:(id:string,value:boolean)=>void;selectable:boolean;canSelect:(row:AidApplication)=>boolean;refreshing:boolean;number:number;onPageChange:(page:number)=>void;perPage:string;onPerPageChange:(value:string)=>void}){
  const names=Object.fromEntries(staff.map(person=>[person.id,person.name]));
  const person=(id:string|null)=>id?names[id]??"Petugas tidak tersedia":"Belum ditugaskan";
  const distributor=(row:AidApplication)=>row.distributionType==="direct"?"Bendahara langsung":person(row.distributorId);
  const checkbox=(row:AidApplication)=><input className={shared.check} type="checkbox" aria-label={`Pilih ${row.number}`} title={canSelect(row)?"Pilih untuk tindakan massal":"Status ini tidak mendukung tindakan massal"} disabled={refreshing||!canSelect(row)} checked={!!selected[row.id]} onChange={event=>onSelect(row.id,event.target.checked)}/>;
  const first=(page.current_page-1)*(page.per_page??Number(perPage))+1;
  return <div aria-busy={refreshing}>
    {view==="cards"?<div className={s.grid}>{page.data.map(row=>{const step=nextStep(row.status,row.source);return <article className={`${s.application} ${selected[row.id]?s.selected:""}`} key={row.id}>
      <div className={s.cardTop}><Badge status={row.status}/>{selectable&&checkbox(row)}</div>
      <div className={s.identity}><p>{row.number}</p><h3><Link href={`/admin/bantuan/pengajuan/${row.id}`}>{row.name}</Link></h3><span>{row.program}</span></div>
      <div className={s.amount}><span><Wallet size={15}/>Nominal bantuan</span><strong>{row.amount!==null?money(row.amount):"Belum ditetapkan"}</strong></div>
      <dl className={s.information}><div><dt><UserRound size={13}/>Verifikator</dt><dd>{person(row.verifierId)}</dd></div><div><dt><UserRound size={13}/>Penyalur</dt><dd>{distributor(row)}</dd></div><div><dt><CalendarDays size={13}/>Tanggal pengajuan</dt><dd>{day(row.createdAt)}</dd></div><div><dt>Sumber pengajuan</dt><dd>{sourceLabels[row.source]??row.source}</dd></div>{row.region&&<div className={s.region}><dt><MapPin size={13}/>Wilayah</dt><dd>{row.region}</dd></div>}</dl>
      <div className={s.next}><span>{step.owner}</span><p>{step.title}</p></div>
      <Link className={s.open} href={`/admin/bantuan/pengajuan/${row.id}`} aria-label={`Buka pengajuan ${row.name}, ${row.number}`}>Buka pengajuan<ArrowRight size={16}/></Link>
    </article>;})}</div>:<div className={shared.tableWrap}><table className={shared.table}><thead><tr>{selectable&&<th aria-label="Pilih pengajuan"/>}<th>Pemohon</th><th>Program / sumber</th><th>Status</th><th>Nominal bantuan</th><th>Verifikator / penyalur</th><th>Tanggal</th><th className={shared.stickyAction}>Aksi</th></tr></thead><tbody>{page.data.map(row=><tr key={row.id}>{selectable&&<td>{checkbox(row)}</td>}<td><Link className={shared.applicantLink} href={`/admin/bantuan/pengajuan/${row.id}`}><strong>{row.name}</strong></Link><small>{row.number}</small></td><td>{row.program}<small>{sourceLabels[row.source]??row.source}{row.region?` · ${row.region}`:""}</small></td><td><Badge status={row.status}/></td><td>{row.amount!==null?money(row.amount):<span className={shared.tiny}>Belum ditetapkan</span>}</td><td>{person(row.verifierId)}<small>Penyalur: {distributor(row)}</small></td><td>{day(row.createdAt)}</td><td className={shared.stickyAction}><Link className={shared.detailButton} href={`/admin/bantuan/pengajuan/${row.id}`}>Buka pengajuan<ArrowRight size={14}/></Link></td></tr>)}</tbody></table></div>}
    <div className={s.pagination}><div><strong>Menampilkan {first}–{first+page.data.length-1} dari {page.total} pengajuan</strong><span>Halaman {page.current_page} dari {page.last_page}</span></div><div className={s.pageControls}><label>Per halaman<select aria-label="Jumlah pengajuan per halaman" value={perPage} disabled={refreshing} onChange={event=>onPerPageChange(event.target.value)}>{[12,24,48].map(size=><option key={size} value={size}>{size}</option>)}</select></label><button type="button" disabled={refreshing||number<=1} onClick={()=>onPageChange(number-1)}>← Sebelumnya</button><button type="button" disabled={refreshing||number>=page.last_page} onClick={()=>onPageChange(number+1)}>Berikutnya →</button></div></div>
  </div>;
}
