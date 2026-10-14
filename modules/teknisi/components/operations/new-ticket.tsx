import Link from "next/link";
import type { TechnicianUser } from "../../api/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { outletScope,ticketScope } from "../../api/policy";
import { addTicket } from "../../api/actions";
import { ActionForm } from "../ActionForm";
import { Field,Choice } from "../Fields";
import { PhotoFields } from "../PhotoFields";
export async function NewTicketView({user,rootHref,searchParams}:{user:TechnicianUser;rootHref:string;searchParams?:Promise<{garansi?:string}>}){
 if(!user.canWrite)redirect(`${rootHref}/tiket`);
 const query=await searchParams;const original=query?.garansi?await prisma.teknisiTicket.findFirst({where:{id:query.garansi,status:"collected",...ticketScope(user)}}):null;
 const [outlets,technicians]=await Promise.all([prisma.teknisiOutlet.findMany({where:{isActive:true,...outletScope(user)}}),prisma.teknisiTechnician.findMany({where:{isActive:true,...(user.technician?{id:user.technician.id}:{})}})]);
 return <div className="tech-form-page"><Link href={`${rootHref}/tiket`}>← Pending Service</Link><h1 className="mt-4">{original?"Servis lanjutan / garansi":"Terima servis baru"}</h1><p className="tech-note">Catat kondisi awal dan estimasi. Servis masuk ke Pending setelah disimpan.{original&&` Terhubung ke ${original.number}.`}</p><div className="tech-box">{!outlets.length?<p>Tambahkan outlet terlebih dahulu.</p>:<ActionForm action={addTicket} submit="Simpan ke Pending"><input type="hidden" name="originalTicketId" value={original?.id??""}/><input type="hidden" name="priority" value="normal"/><div className="tech-form-grid">{user.technician?<input type="hidden" name="outletId" value={user.technician.outletId}/>:<><Choice name="outletId" label="Outlet" value={original?.outletId} required><option value="">Pilih outlet</option>{outlets.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Choice><Choice name="technicianId" label="Teknisi penanggung jawab"><option value="">Tugaskan saat proses</option>{technicians.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Choice></>}<Field name="customerName" label="Nama pelanggan" value={original?.customerName}/><Field name="customerPhone" label="Nomor HP pelanggan" type="tel" maxLength={30} value={original?.customerPhone}/><Field name="device" label="Merek & tipe HP" value={original?.device}/><Field name="imei" label="IMEI / nomor seri (opsional)" required={false}/><div className="full"><Field name="complaint" label="Keluhan pelanggan" maxLength={3000}/></div><div className="full"><Field name="accessories" label="Kondisi fisik & kelengkapan" maxLength={1000} required={false}/></div><Field name="estimate" label="Estimasi total biaya (Rp)" type="number" min={0} value={0}/><Field name="dueAt" label="Estimasi tanggal selesai" type="date"/><div className="full"><PhotoFields/></div></div></ActionForm>}</div></div>;
}
