import { prisma } from "@/lib/prisma";
import { requireTechnicianOperator } from "../../api/access";
import { OperatorShell } from "../../components/OperatorShell";
export const metadata = { title: { default: "Panel Outlet", template: "%s | Teknisi HP" }, robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireTechnicianOperator();
  const [outlet, profile] = await Promise.all([
    prisma.teknisiOutlet.findUniqueOrThrow({ where: { id: user.technician.outletId }, select: { name: true } }),
    prisma.teknisiParticipant.findFirst({ where: { userId: user.id, deletedAt: null }, select: { nip: true } }),
  ]);
  return <OperatorShell user={{ name: user.name, nip: profile?.nip ?? "NIP belum tersedia" }} outletName={outlet.name}>{children}</OperatorShell>;
}
