import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTechnicianUser } from "../../../api/access";
import { editTeknisiAccount } from "../../../api/participant-actions";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { ActionForm } from "../../../components/ActionForm";
import { Choice, Field } from "../../../components/Fields";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTechnicianUser();
  if (!user.canManage) redirect("/admin/teknisi/teknisi");
  const { id } = await params;
  const person = await prisma.teknisiParticipant.findFirst({ where: { id, deletedAt: null }, include: { user: { select: { name: true } } } });
  if (!person) notFound();
  const [technician, outlets] = await Promise.all([prisma.teknisiTechnician.findUnique({ where: { userId: person.userId } }), prisma.teknisiOutlet.findMany({ where: { isActive: true }, include: { technicians: { where: { isActive: true }, select: { userId: true } } }, orderBy: { name: "asc" } })]);
  return <><Link href="/admin/teknisi/teknisi" className="mb-4 inline-block text-sm text-accent">← Akun Teknisi</Link><PageHeader title="Edit Akun Teknisi" description={`NIP ${person.nip} · Setiap outlet hanya memiliki satu teknisi aktif.`} /><Card className="max-w-2xl"><ActionForm action={editTeknisiAccount.bind(null, id)} submit="Simpan Perubahan"><ParticipantRegistrationFields values={{ name: person.user.name, address: person.address, phone: person.phone }} /><Choice name="outletId" label="Outlet" required value={technician?.outletId ?? ""}><option value="">Pilih outlet</option>{outlets.map(outlet => <option key={outlet.id} value={outlet.id} disabled={outlet.technicians.some(tech => tech.userId !== person.userId)}>{outlet.name}{outlet.technicians.some(tech => tech.userId !== person.userId) ? " · Sudah memiliki teknisi" : ""}</option>)}</Choice><Field name="specialty" label="Keahlian (opsional)" required={false} value={technician?.specialty ?? "Servis HP"} /></ActionForm></Card></>;
}
