import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TechnicianUser } from "./access";
import { canTransition, integer, isStatus, terminalStatuses, text, ticketScope } from "./policy";

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
  const outletId = text(form, "outletId");
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
  if (dueAt && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(dueAt.getTime()) || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate)) throw new Error("Tanggal target tidak valid.");
  return prisma.teknisiTicket.create({ data: {
    number: `HP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`,
    trackingToken: randomBytes(24).toString("hex"), outletId, technicianId, participantId, priority, dueAt,
    customerName: participant?.user.name ?? text(form, "customerName"), customerPhone: participant?.phone ?? text(form, "customerPhone", 30), device: text(form, "device"),
    imei: text(form, "imei", 30, false) || null, complaint: text(form, "complaint", 3000), accessories: text(form, "accessories", 1000, false) || null,
    estimate: integer(form, "estimate"), events: { create: { status: "received", note: "Perangkat diterima di outlet.", actorName: user.name } },
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
  if (!user.canWrite) throw new Error("Akun monitoring hanya dapat melihat data.");
  const id = text(form, "ticketId");
  const status = text(form, "status");
  const expectedStatus = text(form, "expectedStatus");
  const expectedVersion = text(form, "expectedVersion", 40);
  const note = text(form, "note", 3000);
  if (!isStatus(status)) throw new Error("Status tidak valid.");
  await prisma.$transaction(async tx => {
    const ticket = await tx.teknisiTicket.findFirst({ where: { id, ...ticketScope(user) } });
    if (!ticket) throw new Error("Tiket tidak ditemukan atau tidak dapat diakses.");
    if (ticket.status !== expectedStatus || ticket.updatedAt.toISOString() !== expectedVersion) throw new Error("Tiket telah diperbarui. Muat ulang halaman sebelum menyimpan.");
    if (terminalStatuses.includes(ticket.status)) throw new Error("Tiket ini sudah ditutup.");
    if (!canTransition(ticket.status, status)) throw new Error("Perubahan status tidak sesuai alur servis.");
    if (status === "collected" && !user.canManage) throw new Error("Pengambilan perangkat harus dicatat admin outlet.");
    const technicianId = user.canManage ? text(form, "technicianId", 200, false) || null : user.technician!.id;
    if (technicianId && !await tx.teknisiTechnician.findFirst({ where: { id: technicianId, outletId: ticket.outletId, isActive: true } })) throw new Error("Teknisi harus aktif dan berasal dari outlet tiket.");
    if (["repairing", "ready"].includes(status) && !technicianId) throw new Error("Tentukan teknisi sebelum mulai mengerjakan servis.");
    const result = await tx.teknisiTicket.updateMany({ where: { id, status: expectedStatus, updatedAt: ticket.updatedAt }, data: { status, technicianId, ...(user.canManage ? { estimate: integer(form, "estimate"), serviceCost: integer(form, "serviceCost") } : {}) } });
    if (result.count !== 1) throw new Error("Tiket telah diperbarui. Muat ulang halaman.");
    await tx.teknisiEvent.create({ data: { ticketId: id, status, note, actorName: user.name } });
  });
}
export async function createPart(user: TechnicianUser, form: FormData) {
  if (!user.canWrite) throw new Error("Akun monitoring hanya dapat melihat data.");
  const outletId = text(form, "outletId");
  if (user.role === "technician" && outletId !== user.technician?.outletId) throw new Error("Sparepart hanya dapat ditambahkan di outlet sendiri.");
  if (!await prisma.teknisiOutlet.findFirst({ where: { id: outletId, isActive: true } })) throw new Error("Outlet tidak aktif.");
  const stock = integer(form, "stock");
  return prisma.teknisiPart.create({ data: { outletId, sku: text(form, "sku", 60), name: text(form, "name"), stock, minimum: integer(form, "minimum"), price: integer(form, "price"), movements: { create: { quantity: stock, note: "Stok awal", actorName: user.name } } } });
}
export async function restockPart(user: TechnicianUser, form: FormData) {
  if (!user.canWrite) throw new Error("Akun monitoring hanya dapat melihat data.");
  const partId = text(form, "partId");
  const quantity = integer(form, "quantity", 1);
  const note = text(form, "note", 500);
  await prisma.$transaction(async tx => {
    const part = await tx.teknisiPart.findFirst({ where: { id: partId, ...(user.role === "technician" ? { outletId: user.technician?.outletId ?? "" } : {}) } });
    if (!part) throw new Error("Sparepart tidak ditemukan di outlet Anda.");
    await tx.teknisiPart.update({ where: { id: partId }, data: { stock: { increment: quantity } } });
    await tx.teknisiStockMovement.create({ data: { partId, quantity, note, actorName: user.name } });
  });
}
export async function recordPartNeed(user: TechnicianUser, form: FormData) {
  if (!user.canWrite) throw new Error("Akun monitoring hanya dapat melihat data.");
  const ticketId = text(form, "ticketId");
  const partId = text(form, "partId", 191, false);
  const quantity = integer(form, "quantity", 1);
  const note = text(form, "note", 2000);
  await prisma.$transaction(async tx => {
    const ticket = await tx.teknisiTicket.findFirst({ where: { id: ticketId, ...ticketScope(user) } });
    if (!ticket) throw new Error("Tiket tidak ditemukan atau tidak dapat diakses.");
    if (terminalStatuses.includes(ticket.status)) throw new Error("Tiket ini sudah ditutup.");
    const part = partId ? await tx.teknisiPart.findFirst({ where: { id: partId, outletId: ticket.outletId } }) : null;
    if (partId && !part) throw new Error("Sparepart harus berasal dari outlet tiket.");
    const locked = await tx.teknisiTicket.updateMany({ where: { id: ticketId, status: ticket.status, updatedAt: ticket.updatedAt }, data: { updatedAt: new Date() } });
    if (locked.count !== 1) throw new Error("Tiket berubah. Muat ulang dan coba kembali.");
    await tx.teknisiEvent.create({ data: { ticketId, status: ticket.status, actorName: user.name, note: `Kebutuhan sparepart: ${part ? `${part.name} (${part.sku})` : "Belum terdaftar"} × ${quantity} unit.\n${note}` } });
  });
}
export async function consumeSparepart(user: TechnicianUser, form: FormData) {
  if (!user.canWrite) throw new Error("Akun monitoring hanya dapat melihat data.");
  const ticketId = text(form, "ticketId");
  const partId = text(form, "partId");
  const quantity = integer(form, "quantity", 1);
  await prisma.$transaction(async tx => {
    const ticket = await tx.teknisiTicket.findFirst({ where: { id: ticketId, ...ticketScope(user) } });
    if (!ticket || !["diagnosis", "repairing", "waiting_parts"].includes(ticket.status)) throw new Error("Sparepart hanya dapat dipakai saat pengecekan atau pengerjaan.");
    // Kunci versi tiket untuk mencegah pemakaian sparepart bersamaan dengan penutupan tiket.
    const locked = await tx.teknisiTicket.updateMany({ where: { id: ticketId, status: ticket.status, updatedAt: ticket.updatedAt }, data: { updatedAt: new Date() } });
    if (locked.count !== 1) throw new Error("Tiket berubah. Muat ulang dan coba kembali.");
    const part = await tx.teknisiPart.findFirst({ where: { id: partId, outletId: ticket.outletId } });
    if (!part) throw new Error("Sparepart harus berasal dari outlet tiket.");
    const changed = await tx.teknisiPart.updateMany({ where: { id: partId, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
    if (changed.count !== 1) throw new Error("Stok sparepart tidak mencukupi.");
    await tx.teknisiPartUse.create({ data: { ticketId, partId, quantity, unitPrice: part.price } });
    await tx.teknisiStockMovement.create({ data: { partId, quantity: -quantity, note: `Dipakai pada ${ticket.number}`, actorName: user.name } });
    await tx.teknisiEvent.create({ data: { ticketId, status: ticket.status, note: `Pemakaian ${part.name}: ${quantity} unit.`, actorName: user.name } });
  });
}
