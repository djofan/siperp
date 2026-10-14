import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TechnicianUser } from "./access";
import { integer, terminalStatuses, text, ticketScope } from "./policy";
import { readPhotos } from "./photos";

function requireManager(user: TechnicianUser) { if (!user.canManage) throw new Error("Hanya admin atau manajer yang dapat mengubah data ini."); }
export async function createOutlet(user: TechnicianUser, form: FormData) {
  requireManager(user);
  return prisma.teknisiOutlet.create({ data: { name: text(form, "name"), address: text(form, "address", 1000), phone: text(form, "phone", 30) } });
}
export async function saveTechnician(user: TechnicianUser, form: FormData) {
  requireManager(user);
  const userId = text(form, "userId");
  const outletId = text(form, "outletId");
  const [account, outlet] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, isActive: true, moduleAccess: { some: { role: "technician", module: { slug: "teknisi", isActive: true } } } } }),
    prisma.teknisiOutlet.findFirst({ where: { id: outletId, isActive: true } }),
  ]);
  if (!account || !outlet) throw new Error("Pilih akun teknisi dan outlet yang aktif.");
  const existing = await prisma.teknisiTechnician.findUnique({ where: { userId } });
  if (existing && existing.outletId !== outletId && await prisma.teknisiTicket.count({ where: { technicianId: existing.id, status: { notIn: terminalStatuses } } })) throw new Error("Selesaikan tiket aktif sebelum memindahkan teknisi ke outlet lain.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM teknisi_outlets WHERE id = ${outletId} FOR UPDATE`;
    if (await tx.teknisiTechnician.findFirst({ where: { outletId, isActive: true, userId: { not: userId } } })) throw new Error("Outlet ini sudah memiliki teknisi aktif.");
    const data = { name: account.name, outletId, activeOutletId: outletId, specialty: text(form, "specialty"), isActive: true };
    return tx.teknisiTechnician.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  });
}
export async function createTicket(user: TechnicianUser, form: FormData) {
  if (!user.canWrite) throw new Error("Hanya admin, manajer, atau teknisi yang dapat menerima servis.");
  const photos = await readPhotos(form);
  const outletId = user.technician?.outletId ?? text(form, "outletId");
  if (user.role === "technician" && outletId !== user.technician?.outletId) throw new Error("Teknisi hanya dapat menerima servis di outletnya sendiri.");
  const technicianId = user.role === "technician" ? user.technician!.id : text(form, "technicianId", 200, false) || null;
  const participantId = user.role === "technician" ? null : text(form, "participantId", 191, false) || null;
  const participant = participantId ? await prisma.teknisiParticipant.findFirst({ where: { id: participantId, user: { isActive: true } }, select: { id: true, phone: true, user: { select: { name: true } } } }) : null;
  if (participantId && !participant) throw new Error("Peserta tidak ditemukan atau akun tidak aktif.");
  const outlet = await prisma.teknisiOutlet.findFirst({ where: { id: outletId, isActive: true } });
  if (!outlet) throw new Error("Outlet tidak aktif.");
  if (technicianId && !await prisma.teknisiTechnician.findFirst({ where: { id: technicianId, outletId, isActive: true } })) throw new Error("Teknisi harus berasal dari outlet yang dipilih.");
  const priority = text(form, "priority");
  if (!["normal", "urgent"].includes(priority)) throw new Error("Prioritas tidak valid.");
  const dueDate = text(form, "dueAt", 10, false);
  const dueAt = dueDate ? new Date(`${dueDate}T23:59:59+07:00`) : null;
  if (!dueAt) throw new Error("Tentukan estimasi tanggal selesai.");
  if (dueAt && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(dueAt.getTime()) || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate)) throw new Error("Tanggal target tidak valid.");
  const originalTicketId = text(form,"originalTicketId",191,false) || null;
  if(originalTicketId && !await prisma.teknisiTicket.findFirst({where:{id:originalTicketId,status:"collected",outletId,...ticketScope(user)}})) throw new Error("Servis garansi harus terhubung ke riwayat Finish outlet yang sama.");
  return prisma.teknisiTicket.create({ data: {
    number: `HP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`,
    trackingToken: randomBytes(24).toString("hex"), outletId, technicianId, participantId, priority, dueAt, originalTicketId,
    customerName: participant?.user.name ?? text(form, "customerName"), customerPhone: participant?.phone ?? text(form, "customerPhone", 30), device: text(form, "device"),
    imei: text(form, "imei", 30, false) || null, complaint: text(form, "complaint", 3000), accessories: text(form, "accessories", 1000, false) || null,
    estimate: integer(form, "estimate"), photos:{create:photos.map(data=>({data,stage:"awal"}))}, events: { create: { status: "received", note: "Perangkat diterima di outlet.", actorName: user.name } },
  } });
}
export async function linkTicketParticipant(user: TechnicianUser, form: FormData) {
  requireManager(user);
  const ticketId = text(form, "ticketId");
  const participantId = text(form, "participantId", 191, false) || null;
  if (participantId && !await prisma.teknisiParticipant.findFirst({ where: { id: participantId, user: { isActive: true } } })) throw new Error("Peserta tidak ditemukan atau akun tidak aktif.");
  await prisma.teknisiTicket.update({ where: { id: ticketId }, data: { participantId } });
}
export async function updateTicket(user: TechnicianUser, form: FormData) {
  void user; void form;
  throw new Error("Gunakan form tahap servis baru untuk mengubah status, biaya, atau pembayaran.");
}
