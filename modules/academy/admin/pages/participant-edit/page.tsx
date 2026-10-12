import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { editAcademyAccount } from "../../../api/participant-registration";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAcademyAdmin();
  const { id } = await params;
  const person = await prisma.zakatAcademyProfile.findFirst({ where: { id, deletedAt: null, user: { isSuperadmin: false, moduleAccess: { none: { role: { in: ["admin", "teacher"] }, module: { slug: "academy" } } } } }, include: { user: { select: { name: true } } } });
  if (!person) notFound();
  return <><Link href="/admin/academy/pendaftaran" className="mb-4 inline-block text-sm text-accent">← Pendaftaran & Grup</Link><PageHeader title="Edit Akun Peserta" description={`NIP ${person.nis} · Nomor akun tetap sama setelah diedit.`} /><Card className="max-w-2xl"><ActionForm action={editAcademyAccount.bind(null, id)} label="Simpan Perubahan"><ParticipantRegistrationFields academy values={{ name: person.user.name, address: person.address, phone: person.phone, gender: person.gender }} /></ActionForm></Card></>;
}
