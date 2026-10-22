import Link from "next/link";
import type { WorkflowTicket } from "../api/workflow";
import { currency, dateTime } from "../api/queries";
import { ServicePhotos } from "./ServicePhotos";

export function WarrantyComparison({ticket,root}:{ticket:WorkflowTicket;root:string}) {
  if(ticket.workflow?.serviceType!=="warranty")return null;
  const original=ticket.warranty_source;
  if(!original)return <section className="tech-box"><h2>Servis asal</h2><p>Data servis asal tidak tersedia dalam cakupan akses akun ini.</p></section>;
  const history=original.workflow;
  const rows=[
    ["Nomor servis",original.number,ticket.number],
    ["Pelanggan",original.customerName,ticket.customerName],
    ["No. HP",original.customerPhone,ticket.customerPhone],
    ["Perangkat",original.device,ticket.device],
    ["IMEI / seri",original.imei??"Tidak dicatat",ticket.imei??"Tidak dicatat"],
    ["Keluhan awal / keluhan klaim",original.complaint,ticket.complaint],
    ["Kondisi & kelengkapan",original.accessories??"Tidak dicatat",ticket.accessories??"Tidak dicatat"],
    ["Teknisi",original.technician?.name??"Belum ditugaskan",ticket.technician?.name??"Belum ditugaskan"],
    ["Outlet",original.outlet.name,ticket.outlet.name],
    ["Diterima",dateTime(original.createdAt),dateTime(ticket.createdAt)],
    ["Estimasi",currency(original.estimate),currency(ticket.estimate)],
    ["Kerusakan / diagnosis",history?.diagnosis??"Belum dicatat",ticket.workflow?.diagnosis??"Belum dievaluasi"],
    ["Tindakan",history?.treatment??"Belum dicatat",ticket.workflow?.treatment??"Belum dievaluasi"],
    ["Part dibeli/diganti",history?.replacedParts??"Tidak dicatat",ticket.workflow?.replacedParts??"Belum dicatat"],
    ["Modal",history?.capital!=null?currency(history.capital):"Tidak dicatat",ticket.workflow?.capital!=null?currency(ticket.workflow.capital):"Belum dicatat"],
    ["Harga final",currency(history?.finalPrice??original.serviceCost),ticket.workflow?.finalPrice!=null?currency(ticket.workflow.finalPrice):"Opsional untuk garansi"],
    ["Mulai dikerjakan",history?.startedAt?dateTime(history.startedAt):"Tidak dicatat",ticket.workflow?.startedAt?dateTime(ticket.workflow.startedAt):"Belum dimulai"],
    ["Siap diambil",history?.readyAt?dateTime(history.readyAt):"Tidak dicatat",ticket.workflow?.readyAt?dateTime(ticket.workflow.readyAt):"Belum selesai"],
    ["Diambil",history?.collectedAt?dateTime(history.collectedAt):"Tidak dicatat",ticket.workflow?.collectedAt?dateTime(ticket.workflow.collectedAt):"Belum diambil"],
    ["Garansi berakhir",history?.warrantyUntil?dateTime(history.warrantyUntil):"Tidak ada",ticket.workflow?.warrantyUntil?dateTime(ticket.workflow.warrantyUntil):"Belum ditentukan"],
  ];
  return <section className="tech-box"><h2>Perbandingan servis asal & klaim garansi</h2><p className="tech-note">Gunakan keluhan, hasil diagnosis, tindakan, dan dokumentasi sebelumnya untuk evaluasi. Catatan servis asal tidak ditimpa.</p><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Data</th><th>Servis asal</th><th>Klaim saat ini</th></tr></thead><tbody>{rows.map(([label,before,after])=><tr key={label}><th>{label}</th><td className="whitespace-pre-wrap">{before}</td><td className="whitespace-pre-wrap">{after}</td></tr>)}</tbody></table></div>
    <h3 className="mt-4">Foto penerimaan & hasil perbaikan servis asal</h3><ServicePhotos media={(original.media??[]).filter(photo=>["before","after"].includes(photo.stage))}/>
    <details className="mt-4"><summary>Riwayat pengerjaan servis asal</summary><ol className="tech-history">{original.events.map(event=><li key={event.id}><p>{event.note}</p><small>{event.actorName} · {dateTime(event.createdAt)}</small></li>)}</ol></details>
    <Link className="tech-btn secondary mt-4" href={`${root}/tiket/${original.id}?status=collected`}>Buka servis asal →</Link>
  </section>;
}
