import "server-only";
import { prisma } from "@/lib/prisma";
import { type TechnicianUser, outletScope, ticketScope } from "./access";
import { isStatus, terminalStatuses } from "./policy";
export async function listTickets(user: TechnicianUser, filters: { q?: string; status?: string; outlet?: string; page?: string }) {
  const q = (filters.q ?? "").slice(0, 200);
  const parsedPage = Number(filters.page ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const outletId = user.role === "technician" ? user.technician!.outletId : filters.outlet;
  const where = { ...ticketScope(user), ...(filters.status && isStatus(filters.status) ? { status: filters.status } : {}), ...(outletId ? { outletId } : {}), ...(q ? { OR: [{ number: { contains: q } }, { customerName: { contains: q } }, { device: { contains: q } }, { customerPhone: { contains: q } }] } : {}) };
  const [tickets, total, outlets] = await Promise.all([
    prisma.teknisiTicket.findMany({ where, include: { outlet: true, technician: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25 }),
    prisma.teknisiTicket.count({ where }), prisma.teknisiOutlet.findMany({ where: outletScope(user), orderBy: { name: "asc" } }),
  ]);
  return { tickets, total, outlets, page };
}
export async function monitoring(user: TechnicianUser, outlet?: string) {
  if (user.role === "technician") outlet = user.technician!.outletId;
  const scope = { ...ticketScope(user), ...(outlet ? { outletId: outlet } : {}) };
  const partScope = user.role === "technician" ? { outletId: user.technician!.outletId } : {};
  const [grouped, overdue, recent, outlets, parts, technicians] = await Promise.all([
    prisma.teknisiTicket.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.teknisiTicket.findMany({ where: { ...scope, status: { notIn: terminalStatuses }, dueAt: { lt: new Date() } }, include: { outlet: true, technician: true }, orderBy: { dueAt: "asc" }, take: 10 }),
    prisma.teknisiEvent.findMany({ where: { ticket: scope }, include: { ticket: { select: { id: true, number: true, device: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.teknisiOutlet.findMany({ where: outletScope(user), include: { tickets: { where: { ...ticketScope(user), status: { notIn: terminalStatuses } }, select: { status: true } } }, orderBy: { name: "asc" } }),
    prisma.teknisiPart.findMany({ where: { ...partScope, ...(outlet ? { outletId: outlet } : {}) }, include: { outlet: true }, orderBy: { stock: "asc" } }),
    prisma.teknisiTechnician.findMany({ where: { isActive: true, ...(user.role === "technician" ? { id: user.technician!.id } : {}), ...(outlet ? { outletId: outlet } : {}) }, include: { outlet: true, tickets: { where: { status: { notIn: terminalStatuses } }, select: { id: true } } }, orderBy: { name: "asc" } }),
  ]);
  return { grouped, overdue, recent, outlets, lowStock: parts.filter(part => part.stock <= part.minimum), technicians };
}
export const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const dateTime = (value: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value);
