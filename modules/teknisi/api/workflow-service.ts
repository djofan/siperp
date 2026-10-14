import "server-only";
import { prisma } from "@/lib/prisma";
import type { TechnicianUser } from "./access";
import { integer, text, ticketScope, terminalStatuses } from "./policy";
import { checkFinalAmount, paymentMethods, qualityChecks } from "./workflow-policy";
import { readPhotos } from "./photos";

export async function advanceService(user: TechnicianUser, form: FormData) {
  if (!user.canWrite) throw new Error("Akun ini hanya dapat melihat data.");
  const id = text(form, "ticketId"), action = text(form, "operation"), version = text(form, "expectedVersion", 40);
  const photoActions = ["process", "ready", "progress"];
  const photos = photoActions.includes(action) || action==="cancel" ? await readPhotos(form,action!=="cancel"||Number(form.get("cancellationFee"))>0) : [];
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM teknisi_tickets WHERE id = ${id} FOR UPDATE`;
    const ticket = await tx.teknisiTicket.findFirst({ where: { id, ...ticketScope(user) } });
    if (!ticket) throw new Error("Servis tidak ditemukan di outlet Anda.");
    if (ticket.updatedAt.toISOString() !== version) throw new Error("Data telah berubah. Muat ulang halaman sebelum menyimpan.");
    if (terminalStatuses.includes(ticket.status) && action !== "correction") throw new Error("Riwayat yang sudah ditutup tidak dapat diubah.");
    const data: Parameters<typeof tx.teknisiTicket.update>[0]["data"] = {};
    let note = "";
    if (action === "process") {
      if (ticket.status !== "received") throw new Error("Hanya Pending yang dapat mulai diproses.");
      const estimate = integer(form, "estimate");
      if (estimate !== ticket.estimate && form.get("approved") !== "on") throw new Error("Konfirmasi persetujuan pelanggan untuk perubahan estimasi.");
      const technicianId = user.technician?.id ?? text(form, "technicianId");
      if (!await tx.teknisiTechnician.findFirst({ where: { id: technicianId, outletId: ticket.outletId, isActive: true } })) throw new Error("Pilih teknisi aktif dari outlet ini.");
      Object.assign(data, { status: "repairing", technicianId, diagnosis: text(form,"diagnosis",3000), plannedWork: text(form,"plannedWork",3000), estimate, startedAt: new Date() });
      note = `Mulai proses. Diagnosa: ${data.diagnosis}\nTindakan: ${data.plannedWork}\nEstimasi: Rp${estimate}. ${form.get("approved") === "on" ? "Pelanggan menyetujui estimasi." : "Estimasi tidak berubah."}`;
    } else if (action === "progress") {
      if (!["diagnosis","approval","repairing","paused"].includes(ticket.status)) throw new Error("Catatan ini hanya untuk servis dalam proses.");
      const status = text(form,"status");
      if (!["repairing","approval","paused"].includes(status)) throw new Error("Status proses tidak valid.");
      if(ticket.status==="approval" && status==="repairing" && form.get("approved")!=="on")throw new Error("Konfirmasi persetujuan pelanggan sebelum melanjutkan pengerjaan.");
      data.status = status; note = text(form,"note",3000);
    } else if (action === "ready") {
      if (!["diagnosis","approval","repairing","paused"].includes(ticket.status)) throw new Error("Servis belum berada dalam proses.");
      const checks = Object.fromEntries(qualityChecks.map((label,i) => [label, text(form,`check${i}`,20)]));
      if (Object.values(checks).some(value => !["Lulus","Tidak diuji"].includes(value))) throw new Error("Perangkat yang gagal uji belum dapat dinyatakan Ready.");
      if(Object.values(checks).includes("Tidak diuji")) checks["Alasan tidak diuji"]=text(form,"checksNote",1000);
      const evaluation = text(form,"evaluation",3000), serviceCost = integer(form,"serviceCost");
      const total = checkFinalAmount(serviceCost);
      if (total > ticket.estimate && form.get("approved") !== "on") throw new Error("Tagihan melebihi estimasi; konfirmasi persetujuan pelanggan.");
      const warrantyDays = integer(form,"warrantyDays");
      if (warrantyDays > 365) throw new Error("Garansi maksimal 365 hari.");
      Object.assign(data,{status:"ready",evaluation,checks,serviceCost,warrantyDays,readyAt:new Date()});
      note = `Servis selesai. ${evaluation}\nTagihan final: Rp${total}. Garansi ${warrantyDays} hari. ${total > ticket.estimate ? "Perubahan biaya disetujui pelanggan." : "Biaya sesuai estimasi."}`;
    } else if (action === "finish") {
      if (ticket.status !== "ready" || ticket.paidAt) throw new Error("Pembayaran hanya dapat dicatat satu kali untuk servis Ready.");
      const paymentMethod = text(form,"paymentMethod");
      if (!paymentMethods.includes(paymentMethod)) throw new Error("Metode pembayaran tidak valid.");
      const total = checkFinalAmount(ticket.serviceCost);
      if (form.get("confirmed") !== "on") throw new Error("Konfirmasi pembayaran diterima dan perangkat diserahkan.");
      const collectedBy = text(form,"collectedBy");
      Object.assign(data,{status:"collected",paidAt:new Date(),paidAmount:total,paymentMethod,collectedBy});
      note = `Pembayaran Rp${total} diterima melalui ${paymentMethod}. Perangkat diambil oleh ${collectedBy}.`;
    } else if (action === "cancel") {
      if (!["received","diagnosis","approval","repairing","paused"].includes(ticket.status)) throw new Error("Ready tidak dapat dibatalkan tanpa pemeriksaan pengelola.");
      const reason=text(form,"note",3000),handover=text(form,"handover",1000),fee=integer(form,"cancellationFee");
      note = `Dibatalkan: ${reason}. ${handover}`;
      if(fee>0){
        if(form.get("approved")!=="on")throw new Error("Biaya pengecekan harus disetujui pelanggan.");
        Object.assign(data,{status:"ready",outcome:"failed",serviceCost:fee,evaluation:`Servis gagal / dibatalkan: ${reason}`,readyAt:new Date(),warrantyDays:0});
        note+=` Biaya pengecekan Rp${fee} disetujui pelanggan; menunggu pembayaran dan pengambilan di Ready.`;
      }else{data.status="cancelled";data.outcome="cancelled";}
    } else if(action === "correction") {
      if(!user.canManage||ticket.status!=="collected"||!ticket.paidAt)throw new Error("Koreksi transaksi hanya oleh pengelola pada Finish yang sudah dibayar.");
      const serviceCost=integer(form,"serviceCost"),total=checkFinalAmount(serviceCost);
      const reason=text(form,"note",3000);
      if(form.get("confirmed")!=="on")throw new Error("Konfirmasi nominal sesuai pembayaran yang benar-benar diterima.");
      Object.assign(data,{serviceCost,paidAmount:total});
      note=`KOREKSI TRANSAKSI: diterima sebelumnya Rp${ticket.paidAmount}, menjadi Rp${total}. Alasan: ${reason}. Koreksi oleh ${user.name}; tanggal pembayaran tetap.`;
    } else if (action === "edit") {
      if (ticket.status !== "received") throw new Error("Identitas penerimaan hanya dapat diedit saat Pending.");
      Object.assign(data,{customerName:text(form,"customerName"),customerPhone:text(form,"customerPhone",30),device:text(form,"device"),complaint:text(form,"complaint",3000),estimate:integer(form,"estimate")});
      const due=text(form,"dueAt",10),dueAt=new Date(`${due}T23:59:59+07:00`);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||Number.isNaN(dueAt.getTime())||new Date(`${due}T00:00:00Z`).toISOString().slice(0,10)!==due)throw new Error("Estimasi tanggal selesai tidak valid.");
      Object.assign(data,{dueAt,imei:text(form,"imei",30,false)||null,accessories:text(form,"accessories",1000,false)||null});
      note = "Data penerimaan diperbarui.";
    } else throw new Error("Aksi tidak dikenali.");
    await tx.teknisiTicket.update({where:{id},data});
    await tx.teknisiEvent.create({data:{ticketId:id,status:String(data.status ?? ticket.status),note,actorName:user.name}});
    if (photos.length) await tx.teknisiPhoto.createMany({data:photos.map(data=>({ticketId:id,stage:["ready","cancel"].includes(action) ? "hasil" : "proses",data}))});
  });
}
