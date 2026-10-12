import { prisma } from "@/lib/prisma";
import { requireTechnicianOperator } from "../../../api/access";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
export default async function Page() {
  const user = await requireTechnicianOperator();
  const [profile, outlet] = await Promise.all([prisma.teknisiParticipant.findFirst({ where: { userId: user.id, deletedAt: null }, select: { nip: true, address: true, phone: true } }), prisma.teknisiOutlet.findUniqueOrThrow({ where: { id: user.technician.outletId }, select: { name: true } })]);
  return <><PageHeader title="Profil Saya" description="Identitas akun dan penempatan outlet Anda." /><Card className="max-w-2xl"><dl className="grid gap-6 sm:grid-cols-2">{[["Nama", user.name], ["NIP", profile?.nip ?? "Belum tersedia"], ["Outlet", outlet.name], ["Keahlian", user.technician.specialty], ["Nomor HP", profile?.phone ?? "Belum diisi"], ["Alamat", profile?.address ?? "Belum diisi"]].map(([label, value]) => <div key={label}><dt className="text-xs text-foreground/50">{label}</dt><dd className="mt-2 text-sm font-medium">{value}</dd></div>)}</dl></Card></>;
}
