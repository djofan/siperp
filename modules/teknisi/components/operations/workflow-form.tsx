import Link from "next/link";
import { notFound } from "next/navigation";
import type { TechnicianUser } from "../../api/access";
import { ticketData } from "../../api/view-data";
import { nextStatuses,terminalStatuses,isStatus,statuses } from "../../api/policy";
import { updateService } from "../../api/ui-actions";
import { ActionForm } from "../ActionForm";
import { Choice,Field } from "../Fields";
import { currency } from "../../api/queries";
export async function WorkflowForm({user,params,root}:{user:TechnicianUser;params:Promise<{id:string;operation:string}>;root:string}){
  const {id,operation}=await params;
  if(operation!=="update"||!user.canWrite)notFound();
  const data=await ticketData(id);if(!data?.ticket)notFound();
  const {ticket,technicians}=data;
  if(terminalStatuses.includes(ticket.status))notFound();
  const options=[ticket.status,...nextStatuses(ticket.status)].filter(status=>user.canManage||status!=="collected");
  return <div className="tech-form-page"><Link href={`${root}/tiket/${encodeURIComponent(id)}`}>← Detail servis</Link><h1 className="mt-4">Perbarui pengerjaan</h1><p className="tech-note">{ticket.number} · {ticket.device} · {ticket.customerName}</p><section className="tech-box"><h2>Informasi penerimaan</h2><dl className="tech-intake"><div><dt>Keluhan pelanggan</dt><dd>{ticket.complaint}</dd></div><div><dt>Kondisi / kelengkapan saat diterima</dt><dd>{ticket.accessories??"Belum dicatat"}</dd></div><div><dt>Nomor HP pelanggan</dt><dd>{ticket.customerPhone}</dd></div><div><dt>Estimasi biaya</dt><dd>{currency(ticket.estimate)}</dd></div></dl></section><section className="tech-box"><ActionForm action={updateService} submit="Simpan perkembangan" confirmMessage="Yakin perubahan status dan catatan sudah benar? Pengambilan atau pembatalan akan menutup tiket sesuai aturan backend."><input type="hidden" name="ticketId" value={ticket.id}/><input type="hidden" name="expectedStatus" value={ticket.status}/><input type="hidden" name="expectedVersion" value={ticket.updatedAt.toISOString()}/><div className="tech-form-grid"><Choice name="status" label="Status berikutnya" value={ticket.status} required>{options.map(status=><option key={status} value={status}>{isStatus(status)?statuses[status]:status}</option>)}</Choice>{user.canManage&&<><Choice name="technicianId" label="Penanggung jawab" value={ticket.technicianId??""}><option value="">Belum ditugaskan</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Choice><Field name="estimate" label="Estimasi biaya (Rp)" type="number" min={0} value={ticket.estimate}/><Field name="serviceCost" label="Biaya jasa tercatat (Rp)" type="number" min={0} value={ticket.serviceCost}/></>}<Field name="diagnosis" label="Diagnosis kerusakan" required={false} maxLength={900}/><Field name="treatment" label="Tindakan pengerjaan" required={false} maxLength={900}/><div className="full"><Field name="changeReason" label="Persetujuan / alasan perubahan" required={false} maxLength={900}/><small>Isi setidaknya satu catatan sesuai perkembangan servis.</small></div></div><p className="tech-note">Backend memulai penerimaan dari Diterima → Pengecekan sebelum Dikerjakan. Pengambilan dan perubahan biaya hanya dapat dicatat pengelola. Status Finish belum mencatat pembayaran.</p></ActionForm></section></div>;
}
