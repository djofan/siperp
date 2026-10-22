import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { TechnicianUser } from "../../api/access";
import { ticketData } from "../../api/view-data";
import { advanceService } from "../../api/workflow-actions";
import { stageOperation, pendingStatuses } from "../../api/workflow";
import { ActionForm } from "../ActionForm";
import { Choice, Field } from "../Fields";
import { currency } from "../../api/queries";
import { PhotoField, ServicePhotos } from "../ServicePhotos";
import { WarrantyComparison } from "../WarrantyComparison";

export async function WorkflowForm({user,params,root}:{user:TechnicianUser;params:Promise<{id:string;operation:string}>;root:string}) {
  const {id,operation:routeOperation} = await params;
  if (!user.canWrite) notFound();
  const data = await ticketData(id); if (!data?.ticket) notFound();
  const {ticket} = data;
  const stage = ticket.status === "ready" && ticket.workflow?.finalPrice == null
    ? {operation:"complete",label:"Lengkapi hasil servis",destination:"ready"}
    : stageOperation(ticket.status);
  const operation = routeOperation === "update" ? stage?.operation : routeOperation;
  if (!["start","complete","collect","cancel","update"].includes(routeOperation))notFound();
  if (!operation || (operation !== "cancel" && operation !== stage?.operation) || ["collected","cancelled"].includes(ticket.status)) {
    redirect(`${root}/tiket?status=${pendingStatuses.includes(ticket.status)?"received":ticket.status}`);
  }
  const warranty=ticket.workflow?.serviceType==="warranty";
  const titles:Record<string,string>={start:"Periksa sebelum dikerjakan",complete:"Selesaikan perbaikan",collect:"Serah terima & pembayaran",cancel:"Batalkan servis"};
  const submits:Record<string,string>={start:"Kerjakan servis",complete:"Siap diambil",collect:"Finish · sudah diambil & dibayar",cancel:"Batalkan servis"};
  const confirms:Record<string,string>={start:"Yakin ingin mulai mengerjakan perangkat ini?",complete:"Yakin perbaikan sudah selesai dan perangkat siap diambil?",collect:"Pastikan pembayaran sudah diterima dan HP sudah diserahkan. Yakin ingin Finish?",cancel:"Yakin membatalkan servis ini? Data dan riwayat tidak akan dihapus."};
  const backStatus = pendingStatuses.includes(ticket.status) ? "received" : ticket.status;
  return <div className="tech-form-page">
    <Link href={`${root}/tiket?status=${backStatus}`}>← Kembali ke antrean</Link>
    <h1 className="mt-4">{titles[operation]}</h1>
    <p className="tech-note">{ticket.number} · {ticket.device} · {ticket.customerName}</p>
    <section className="tech-box"><h2>Data penerimaan</h2><dl className="tech-intake">
      {[
        ["Pelanggan",ticket.customerName],["No. HP",ticket.customerPhone],["Perangkat",ticket.device],
        ["Outlet",ticket.outlet.name],["Keluhan awal",ticket.complaint],["Kondisi / kelengkapan",ticket.accessories || "Tidak dicatat"],
        ["Estimasi",currency(ticket.estimate)],["Tipe servis",ticket.workflow?.serviceType === "warranty" ? "Garansi" : "Normal"],
      ].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl><ServicePhotos media={ticket.media ?? []} stage="before"/></section>
    <WarrantyComparison ticket={ticket} root={root}/>
    <section className="tech-box"><h2>{operation === "start" ? "Konfirmasi pengerjaan" : titles[operation]}</h2>
      {operation === "start" && <p className="tech-note">Tidak perlu mengisi ulang data. Periksa keluhan, estimasi, dan foto penerimaan di atas, lalu klik Kerjakan.</p>}
      <ActionForm action={advanceService} submit={submits[operation]} confirmMessage={confirms[operation]} draftKey={operation === "start" ? undefined : `teknisi:${user.id}:${ticket.id}:${operation}`}>
        <input type="hidden" name="ticketId" value={ticket.id}/><input type="hidden" name="operation" value={operation}/>
        <input type="hidden" name="expectedStatus" value={ticket.status}/><input type="hidden" name="expectedVersion" value={ticket.updatedAt.toISOString()}/>
        <div className="tech-form-grid">
          {operation === "complete" && <>
            <Field name="diagnosis" label="Kerusakan / hasil diagnosis" maxLength={3000}/>
            <Field name="treatment" label="Tindakan yang dilakukan" maxLength={3000}/>
            <Field name="replacedParts" label="Part yang dibeli / diganti (isi Tidak ada jika tidak mengganti)" maxLength={3000} required={false}/>
            <Field name="capital" label="Modal yang digunakan (Rp)" type="number" min={0}/>
            <Field name="finalPrice" label={warranty?"Harga final opsional (Rp, kosong = gratis)":"Harga final (Rp)"} type="number" min={0} required={!warranty}/>
            <Field name="warrantyDays" label="Garansi (hari, 0 = tanpa garansi)" type="number" min={0} value={0}/>
            <PhotoField name="afterPhoto" label="Foto HP setelah servis"/>
            <p className="tech-note full">Garansi dimulai saat HP diambil. Untuk klaim garansi, harga/pembayaran boleh dikosongkan jika tanpa biaya. Part dicatat untuk evaluasi; tidak mengurangi stok otomatis.</p>
          </>}
          {operation === "collect" && <>
            <Field name="amount" label={warranty?"Pembayaran opsional (Rp, kosong = gratis)":`Pembayaran sesuai harga final (${currency(ticket.workflow?.finalPrice ?? ticket.serviceCost)})`} type="number" min={0} required={!warranty} value={warranty?undefined:ticket.workflow?.finalPrice ?? ticket.serviceCost}/>
            <Choice name="paymentMethod" label={warranty?"Tipe pembayaran (jika ada biaya)":"Tipe pembayaran"} required={!warranty} value={warranty?"":"cash"}>{warranty&&<option value="">Tidak ada pembayaran / gratis</option>}<option value="cash">Tunai / cash</option><option value="transfer">Transfer bank</option><option value="qris">QRIS</option>{warranty&&<option value="warranty">Garansi · tanpa tagihan</option>}</Choice>
            <Field name="receiverName" label="Nama penerima HP" value={ticket.customerName}/>
            <Field name="receiverPhone" label="No. HP penerima" type="tel" maxLength={30} value={ticket.customerPhone}/>
            <PhotoField name="paymentProof" label="Bukti bayar (wajib untuk transfer / QRIS)" required={false}/>
            <PhotoField name="handoverPhoto" label="Bukti serah terima HP"/>
            <p className="tech-note full">Foto serah terima dapat memperlihatkan perangkat dan penerimanya, dengan persetujuan penerima. Pembayaran dicatat sekali setelah benar-benar diterima.</p>
          </>}
          {operation === "cancel" && <div className="full"><Field name="cancelReason" label="Alasan pembatalan" maxLength={3000}/><p className="tech-note">Tiket dipindahkan ke Batal, bukan dihapus. Pastikan perangkat dikembalikan kepada pelanggan.</p></div>}
        </div>
      </ActionForm>
    </section>
  </div>;
}
