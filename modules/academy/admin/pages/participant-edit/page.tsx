import Link from "next/link";
import { notFound } from "next/navigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage3, AcademyCohort } from "@/modules/academy/api/page-contracts";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { editAcademyAccount } from "../../../api/participant-registration";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField, Select } from "@/components/ui/FormField";
import { Card } from "@/components/ui/Card";
export default async function Page({ params, searchParams }: {
    searchParams: Promise<{ from?: string }>;
    params: Promise<{
        id: string;
    }>;
}) {
    await requireAcademyAdmin();
    const { id } = await params;
    const fromUsers = (await searchParams).from === "pengguna";
    const backHref = "/admin/academy/peserta";
    const person = await academyPage<AcademyPage3["person"]>(`academy/admin/people/${encodeURIComponent(id)}`);
    const cohorts = await academyPage<AcademyCohort[]>("academy/admin/cohorts");
    if (!person)
        notFound();
    return <><Link href={backHref} className="mb-4 inline-block text-sm text-accent">← Peserta</Link><PageHeader title="Edit Akun Peserta" description={`NIP ${person.nis} · Nomor akun tetap sama setelah diedit.`}/><Card className="max-w-2xl"><ActionForm action={editAcademyAccount.bind(null, id)} label="Simpan Perubahan"><input type="hidden" name="returnTo" value={fromUsers ? "pengguna" : "pendaftaran"} /><ParticipantRegistrationFields academy values={{ name: person.user.name, address: person.address, phone: person.phone, gender: person.gender }}/><FormField label="Angkatan" htmlFor="edit-participant-cohort"><Select id="edit-participant-cohort" name="cohortId" defaultValue={person.cohortId ?? ""}><option value="">Belum ditentukan</option>{cohorts.map(cohort => <option key={cohort.id} value={cohort.id}>{cohort.title} · {cohort.participants_count} peserta</option>)}</Select></FormField></ActionForm></Card></>;
}
