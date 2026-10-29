import Link from "next/link";
import { redirect } from "next/navigation";
import type { TechnicianUser } from "../../api/access";
import { newTicketData } from "../../api/view-data";
import { addTicket } from "../../api/actions";
import { ActionForm } from "../ActionForm";
import { Field,Choice } from "../Fields";
import { PhotoField } from "../ServicePhotos";
import { ServiceTypeFields } from "../ServiceTypeFields";
export async function NewTicketView({user,rootHref,warrantyId}:{user:TechnicianUser;rootHref:string;warrantyId?:string}) {
  if (!user.canWrite) redirect(`${rootHref}/tiket`);
  const {outlets,technicians,warrantyTickets=[]} = await newTicketData(warrantyId);
  const parent = warrantyTickets.find(ticket=>ticket.id===warrantyId);
  if(warrantyId&&!parent)return <section className="tech-box"><h1>Garansi tidak tersedia</h1><p>Tiket asal tidak ditemukan, berada di outlet lain, atau masa garansinya sudah berakhir.</p><Link className="tech-btn secondary" href={`${rootHref}/tiket?status=collected`}>Kembali ke Finish</Link></section>;
  return <div className="tech-form-page"><Link href={`${rootHref}/tiket?status=received`}>← Pending</Link><h1 className="mt-4">Buat servisan</h1><p className="tech-note">Catat penerimaan sekali. Setelah disimpan, servis langsung masuk menu Pending.</p><div className="tech-box">{!outlets.length ? <p>Belum ada outlet aktif. Hubungi pengelola.</p> : <ActionForm action={addTicket} submit="Buat servisan · masuk Pending" confirmMessage="Pastikan data pelanggan, estimasi, dan foto penerimaan sudah benar." draftKey={`teknisi:${user.id}:new:${parent?.id ?? "normal"}`}>
    <div className="tech-form-grid">
      <ServiceTypeFields tickets={warrantyTickets} parentId={parent?.id}/>
      {user.technician ? <><input type="hidden" name="outletId" value={user.technician.outletId}/><p className="tech-note full">Outlet: {outlets.find(outlet=>outlet.id===user.technician!.outletId)?.name} · Teknisi: {user.name}</p></> : <><Choice name="outletId" label="Outlet" required value={parent?.outletId}><option value="">Pilih outlet</option>{outlets.map(outlet=><option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</Choice><Choice name="technicianId" label="Teknisi penanggung jawab"><option value="">Tugaskan otomatis saat dikerjakan</option>{technicians.map(technician=><option key={technician.id} value={technician.id}>{technician.name} · {technician.outlet.name}</option>)}</Choice></>}
      <Field name="customerName" label="Nama pelanggan" value={parent?.customerName}/><Field name="customerPhone" label="No. HP pelanggan" type="tel" maxLength={30} value={parent?.customerPhone}/>
      <Field name="device" label="Merek dan tipe HP" value={parent?.device}/><Field name="imei" label="IMEI / nomor seri (opsional)" required={false} maxLength={30}/>
      <Field name="complaint" label="Keluhan pelanggan" maxLength={3000}/><Field name="accessories" label="Kondisi fisik dan kelengkapan" maxLength={1000} required={false}/>
      <Field name="estimate" label="Estimasi harga (Rp)" type="number" min={0} value={parent?0:undefined}/><Field name="dueAt" label="Target selesai (opsional)" type="date" required={false}/>
      <Choice name="priority" label="Prioritas" value="normal"><option value="normal">Normal</option><option value="urgent">Mendesak</option></Choice><PhotoField name="beforePhoto" label="Foto HP sebelum servis"/>
      <p className="tech-note full">Garansi harus merujuk tiket Finish yang masih aktif garansinya, pada outlet yang sama. Data perangkat dan pelanggan mengikuti tiket asal; riwayat lama tetap tersimpan.</p>
    </div>
  </ActionForm>}</div></div>;
}
