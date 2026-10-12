import { getTechnicianUser, ticketScope } from "../../access";
import { prisma } from "@/lib/prisma";
import { csvCell, isStatus, statuses } from "../../policy";
export async function GET() {
  const user = await getTechnicianUser();
  if (!user) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  const tickets = await prisma.teknisiTicket.findMany({ where: ticketScope(user), select: { number: true, device: true, status: true, estimate: true, serviceCost: true, createdAt: true, outlet: { select: { name: true } }, technician: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10000 });
  const rows = [["Nomor tiket", "Perangkat", "Outlet", "Teknisi", "Status", "Estimasi (Rp)", "Biaya jasa (Rp)", "Diterima"], ...tickets.map(ticket => [ticket.number, ticket.device, ticket.outlet.name, ticket.technician?.name ?? "", isStatus(ticket.status) ? statuses[ticket.status] : ticket.status, ticket.estimate, ticket.serviceCost, ticket.createdAt.toISOString()])];
  return new Response(`\uFEFF${rows.map(row => row.map(csvCell).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tiket-servis-hp.csv"', "Cache-Control": "no-store" } });
}
