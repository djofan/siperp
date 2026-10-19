import Link from "next/link";
import { redirect } from "next/navigation";
import type { TechnicianUser } from "../../api/access";
import { newTicketData } from "../../api/view-data";
import { addTicket } from "../../api/actions";
import { ActionForm } from "../ActionForm";
import { Field,Choice } from "../Fields";
export async function NewTicketView({user,rootHref}:{user:TechnicianUser;rootHref:string}){
 if(!user.canWrite)redirect(`${rootHref}/tiket`);
 const {outlets,technicians}=await newTicketData();
 return <div className="tech-form-page"><Link href={`${rootHref}/tiket`}>← Semua servisan</Link><h1 className="mt-4">Terima servis baru</h1><p className="tech-note">Catat perangkat dan keluhan. Tiket masuk status Diterima sesuai API Laravel.</p><div className="tech-box">{!outlets.length?<p>Belum ada outlet aktif. Hubungi pengelola untuk menambahkan outlet.</p>:<ActionForm action={addTicket} submit="Simpan penerimaan"><div className="tech-form-grid">{user.technician?<><input type="hidden" name="outletId" value={user.technician.outletId}/><p className="full">Outlet: {outlets.find(o=>o.id===user.technician!.outletId)?.name??"Penempatan aktif"} · Teknisi: {user.name}</p></>:<><Choice name="outletId" label="Outlet" required><option value="">Pilih outlet</option>{outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Choice><Choice name="technicianId" label="Penanggung jawab"><option value="">Tugaskan nanti</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.name} · {t.outlet.name}</option>)}</Choice></>}<Field name="customerName" label="Nama pelanggan"/><Field name="customerPhone" label="No. HP pelanggan" type="tel" maxLength={30}/><Field name="device" label="Merek dan tipe HP"/><Field name="imei" label="IMEI / nomor seri (opsional)" required={false} maxLength={30}/><div className="full"><Field name="complaint" label="Keluhan pelanggan" maxLength={3000}/><Field name="accessories" label="Kondisi fisik dan kelengkapan" maxLength={1000} required={false}/></div><Field name="estimate" label="Estimasi biaya (Rp)" type="number" min={0} value={0}/><Field name="dueAt" label="Target selesai (opsional)" type="date" required={false}/><Choice name="priority" label="Prioritas" value="normal"><option value="normal">Normal</option><option value="urgent">Mendesak</option></Choice></div></ActionForm>}</div></div>;
}
