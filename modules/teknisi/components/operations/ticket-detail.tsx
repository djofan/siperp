import Link from "next/link";
import { notFound } from "next/navigation";
import type { TechnicianUser } from "../../api/access";
import { ticketData } from "../../api/view-data";
import { currency,dateTime } from "../../api/queries";
import { isStatus,statuses } from "../../api/policy";
import { ticketOperation,activeWarranty,pendingStatuses } from "../../api/workflow";
import { TrackingLink } from "../TrackingLink";
import { PrintButton } from "../PrintButton";
import { ServicePhotos } from "../ServicePhotos";
import { ServiceTimer } from "../ServiceTimer";
import { WarrantyComparison } from "../WarrantyComparison";
export async function TicketDetailView({user,params,rootHref}:{user:TechnicianUser;params:Promise<{id:string}>;rootHref:string}) {
  const {id}=await params, data=await ticketData(id); if(!data?.ticket)notFound();
  const {ticket}=data, workflow=ticket.workflow, action=ticketOperation(ticket);
  const backStatus=pendingStatuses.includes(ticket.status)?"received":ticket.status;
  return <>
    <Link href={`${rootHref}/tiket?status=${backStatus}`}>← Kembali ke {isStatus(ticket.status)?statuses[ticket.status]:"servisan"}</Link>
    <header className="tech-dash-heading"><div><span className="tech-eyebrow">{isStatus(ticket.status)?statuses[ticket.status]:ticket.status} · {workflow?.serviceType==="warranty"?"Garansi":"Normal"}</span><h1>{ticket.number}</h1><p>{ticket.device} · {ticket.customerName}</p></div><div className="tech-dash-actions">
      {user.canWrite&&action&&<Link prefetch={false} className="tech-btn" href={`${rootHref}/tiket/${id}/${action.operation}?status=${backStatus}`}>{action.label}</Link>}
      {user.canWrite&&activeWarranty(ticket)&&<Link prefetch={false} className="tech-btn" href={`${rootHref}/tiket/baru?warranty=${id}`}>Kerjakan ulang · garansi</Link>}
      {user.canWrite&&!["collected","cancelled"].includes(ticket.status)&&<Link className="tech-btn secondary" href={`${rootHref}/tiket/${id}/cancel?status=${backStatus}`}>Batal servis</Link>}<PrintButton/>
    </div></header>
    {ticket.status==="repairing"&&<ServiceTimer startedAt={workflow?.startedAt}/>}
    <WarrantyComparison ticket={ticket} root={rootHref}/>
    <div className="tech-detail-grid"><div>
      <section className="tech-box"><h2>Detail penerimaan</h2><dl className="tech-intake">{[
        ["Pelanggan",ticket.customerName],["No. HP",ticket.customerPhone],["Outlet",ticket.outlet.name],
        ["Teknisi",ticket.technician?.name??"Belum ditugaskan"],["Diterima",dateTime(ticket.createdAt)],
        ["Target",ticket.dueAt?dateTime(ticket.dueAt):"Belum ditentukan"],["Keluhan awal",ticket.complaint],
        ["Kondisi / kelengkapan",ticket.accessories??"Tidak dicatat"],
      ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>{workflow?.warrantyParentId&&<p className="tech-note">Klaim dari <Link href={`${rootHref}/tiket/${workflow.warrantyParentId}`}>tiket servis sebelumnya →</Link></p>}<ServicePhotos media={ticket.media??[]} stage="before"/></section>
      {workflow?.readyAt&&<section className="tech-box"><h2>Hasil perbaikan</h2><dl className="tech-intake"><div><dt>Kerusakan</dt><dd>{workflow.diagnosis}</dd></div><div><dt>Tindakan</dt><dd>{workflow.treatment}</dd></div><div><dt>Part dibeli / diganti</dt><dd>{workflow.replacedParts??"Tidak dicatat"}</dd></div><div><dt>Mulai pengerjaan</dt><dd>{workflow.startedAt?dateTime(workflow.startedAt):"Tidak tercatat"}</dd></div><div><dt>Siap diambil</dt><dd>{dateTime(workflow.readyAt)}</dd></div></dl><ServicePhotos media={ticket.media??[]} stage="after"/></section>}
      {workflow?.collectedAt&&<section className="tech-box"><h2>Pengambilan & pembayaran</h2><dl className="tech-intake"><div><dt>Nama penerima</dt><dd>{workflow.receiverName}</dd></div><div><dt>No. HP penerima</dt><dd>{workflow.receiverPhone}</dd></div><div><dt>Waktu pengambilan</dt><dd>{dateTime(workflow.collectedAt)}</dd></div><div><dt>Metode pembayaran</dt><dd>{workflow.paymentMethod}</dd></div></dl><ServicePhotos media={(ticket.media??[]).filter(photo=>["payment","handover"].includes(photo.stage))}/></section>}
      <section className="tech-box"><h2>Riwayat pengerjaan</h2><ol className="tech-history">{ticket.events.map(event=><li key={event.id}><span>{isStatus(event.status)?statuses[event.status]:event.status}</span><p>{event.note}</p><small>{event.actorName} · {dateTime(event.createdAt)}</small></li>)}</ol></section>
    </div><div>
      <section className="tech-box"><h2>Ringkasan biaya</h2><div className="tech-cost-row"><span>Estimasi awal</span><strong>{currency(ticket.estimate)}</strong></div><div className="tech-cost-row"><span>Modal</span><strong>{workflow?.capital!=null?currency(workflow.capital):"Belum dicatat"}</strong></div><div className="tech-cost-row total"><span>Harga final</span><strong>{workflow?.finalPrice!=null?currency(workflow.finalPrice):"Belum ditentukan"}</strong></div><p className="tech-note">{workflow?.collectedAt?"Pembayaran telah dicatat saat serah terima.":"Belum ada pembayaran; dicatat satu kali saat pengambilan."}</p></section>
      <section className="tech-box"><h2>Garansi</h2><p>{workflow?.warrantyDays?workflow.collectedAt?`${workflow.warrantyDays} hari · sampai ${workflow.warrantyUntil?dateTime(workflow.warrantyUntil):"—"}`:`${workflow.warrantyDays} hari sejak pengambilan.`:"Tanpa garansi / belum ditentukan."}</p>{workflow?.warrantyUntil&&<p>{activeWarranty(ticket)?"Garansi masih aktif.":"Masa garansi sudah berakhir."}</p>}</section>
      <section className="tech-box"><h2>Pelacakan pelanggan</h2><p className="mb-4">Tautan hanya menampilkan status; foto, pembayaran, dan catatan internal tidak dibuka ke publik.</p><TrackingLink token={ticket.trackingToken}/></section>
    </div></div>
  </>;
}
