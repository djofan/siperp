import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
const { prisma } = await import("../lib/prisma");
const { createOutlet, createTicket, createPart, consumeSparepart, updateTicket, restockPart, recordPartNeed } = await import("../modules/teknisi/api/service");
const id = `test-${Date.now()}`;
const admin = { id, name: "Penguji", role: "admin", technician: null, canManage: true, canWrite: true };
const viewer = { ...admin, role: "monitoring", canManage: false, canWrite: false };
const outletIds: string[] = [];
function form(values: Record<string, string | number>) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, String(value)); return data; }
try {
  const outlet = await createOutlet(admin, form({ name: id, address: "Data uji sementara", phone: "000" }));
  outletIds.push(outlet.id);
  const otherOutlet = await createOutlet(admin, form({ name: `${id}-lain`, address: "Data uji sementara", phone: "000" }));
  outletIds.push(otherOutlet.id);
  const ticketData = { outletId: outlet.id, customerName: id, customerPhone: "000", device: "HP uji", complaint: "Uji servis", priority: "normal", estimate: 100000 };
  const ticket = await createTicket(admin, form(ticketData));
  assert.match(ticket.trackingToken, /^[a-f0-9]{48}$/);
  await assert.rejects(createTicket(viewer, form(ticketData)), /Hanya admin/);
  const patch = (record: typeof ticket, status: string) => form({ ticketId: ticket.id, expectedStatus: record.status, expectedVersion: record.updatedAt.toISOString(), status, note: "Catatan uji", estimate: 100000, serviceCost: 50000 });
  await assert.rejects(updateTicket(admin, patch(ticket, "collected")), /alur servis/);
  await assert.rejects(updateTicket(viewer, patch(ticket, "diagnosis")), /hanya dapat melihat/);
  await updateTicket(admin, patch(ticket, "diagnosis"));
  await assert.rejects(updateTicket(admin, patch(ticket, "diagnosis")), /telah diperbarui/);
  const part = await createPart(admin, form({ outletId: outlet.id, sku: id, name: "LCD uji", stock: 1, minimum: 1, price: 200000 }));
  const otherPart = await createPart(admin, form({ outletId: otherOutlet.id, sku: id, name: "LCD outlet lain", stock: 1, minimum: 1, price: 100000 }));
  await assert.rejects(consumeSparepart(admin, form({ ticketId: ticket.id, partId: otherPart.id, quantity: 1 })), /outlet tiket/);
  const outcomes = await Promise.allSettled([consumeSparepart(admin, form({ ticketId: ticket.id, partId: part.id, quantity: 1 })), consumeSparepart(admin, form({ ticketId: ticket.id, partId: part.id, quantity: 1 }))]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
  const stock = await prisma.teknisiPart.findUniqueOrThrow({ where: { id: part.id } });
  assert.equal(stock.stock, 0);
  assert.equal(await prisma.teknisiPartUse.count({ where: { ticketId: ticket.id } }), 1);
  assert.equal(await prisma.teknisiStockMovement.count({ where: { partId: part.id, quantity: -1 } }), 1);
  const foreignTech = { ...admin, role: "technician", canManage: false, technician: { id, userId: id, name: "Teknisi lain", outletId: otherOutlet.id, activeOutletId: otherOutlet.id, specialty: "Uji", isActive: true } };
  await assert.rejects(consumeSparepart(foreignTech, form({ ticketId: ticket.id, partId: part.id, quantity: 1 })), /tidak dapat diakses|hanya dapat dipakai/);
  const ownTech = { ...foreignTech, technician: { ...foreignTech.technician, outletId: outlet.id, activeOutletId: outlet.id } };
  await assert.rejects(createPart(ownTech, form({ outletId: otherOutlet.id })), /outlet sendiri/);
  await assert.rejects(restockPart(ownTech, form({ partId: otherPart.id, quantity: 1, note: "Uji" })), /outlet Anda/);
  await assert.rejects(recordPartNeed(foreignTech, form({ ticketId: ticket.id, partId: part.id, quantity: 1, note: "LCD pecah" })), /tidak dapat diakses/);
  await assert.rejects(recordPartNeed(viewer, form({ ticketId: ticket.id })), /hanya dapat melihat/);
  await assert.rejects(recordPartNeed(ownTech, form({ ticketId: ticket.id, partId: otherPart.id, quantity: 1, note: "LCD pecah" })), /outlet tiket/);
  await recordPartNeed(ownTech, form({ ticketId: ticket.id, partId: part.id, quantity: 2, note: "LCD pecah, perlu dipesan" }));
  assert.equal((await prisma.teknisiPart.findUniqueOrThrow({ where: { id: part.id } })).stock, 0);
  assert.equal(await prisma.teknisiEvent.count({ where: { ticketId: ticket.id, note: { startsWith: "Kebutuhan sparepart:" } } }), 1);
  await recordPartNeed(ownTech, form({ ticketId: ticket.id, quantity: 1, note: "Konektor tipe baru" }));
  const ownPart = await createPart(ownTech, form({ outletId: outlet.id, sku: `${id}-baru`, name: "Konektor", stock: 0, minimum: 1, price: 10000 }));
  await restockPart(ownTech, form({ partId: ownPart.id, quantity: 2, note: "Barang datang" }));
  assert.equal((await prisma.teknisiPart.findUniqueOrThrow({ where: { id: ownPart.id } })).stock, 2);
  const current = await prisma.teknisiTicket.findUniqueOrThrow({ where: { id: ticket.id } });
  await updateTicket(admin, patch(current, "cancelled"));
  await assert.rejects(consumeSparepart(admin, form({ ticketId: ticket.id, partId: part.id, quantity: 1 })), /hanya dapat dipakai/);
  await assert.rejects(recordPartNeed(ownTech, form({ ticketId: ticket.id, quantity: 1, note: "Tutup" })), /sudah ditutup/);
  console.log("Lulus: pembuatan tiket, token publik, hak akses, alur status, konflik versi, isolasi outlet, transaksi dan konkurensi sparepart.");
} finally {
  const tickets = await prisma.teknisiTicket.findMany({ where: { outletId: { in: outletIds } }, select: { id: true } });
  const ticketIds = tickets.map(ticket => ticket.id);
  const parts = await prisma.teknisiPart.findMany({ where: { outletId: { in: outletIds } }, select: { id: true } });
  await prisma.$transaction([
    prisma.teknisiPartUse.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.teknisiEvent.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.teknisiTicket.deleteMany({ where: { id: { in: ticketIds } } }),
    prisma.teknisiStockMovement.deleteMany({ where: { partId: { in: parts.map(part => part.id) } } }),
    prisma.teknisiPart.deleteMany({ where: { id: { in: parts.map(part => part.id) } } }),
    prisma.teknisiOutlet.deleteMany({ where: { id: { in: outletIds } } }),
  ]);
  await prisma.$disconnect();
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
