import Link from "next/link";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { academyPage } from "../../../api/page-data";
import type { AcademyPage1, AcademyCohort } from "../../../api/page-contracts";
import { ParticipantDirectory } from "../../../components/admin/ParticipantDirectory";
import { ParticipantAccounts } from "../../../components/admin/ParticipantAccounts";
import { AdminHeading, SavedNotice } from "../../../components/admin/AdminUi";
import { Card, CardTitle } from "@/components/ui/Card";
import { ActionForm } from "../../../components/ActionForm";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { FormField, Select } from "@/components/ui/FormField";
import { registerAcademyParticipant } from "../../../api/participant-registration";
import { CohortsPanel } from "../angkatan/page";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  const tab = query.tab === "pendaftaran" || query.tab === "angkatan" ? query.tab : "daftar";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const cohort = typeof query.cohort === "string" ? query.cohort : "";
  const group = query.group === "IKHWAN" || query.group === "AKHWAT" ? query.group : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = tab === "daftar" ? await academyPage<AcademyPage1>(`academy/admin/intake?${new URLSearchParams({ q, cohort, group, page: String(page) })}`) : null;
  const cohorts = tab === "pendaftaran" ? await academyPage<AcademyCohort[]>("academy/admin/cohorts") : [];
  return <><AdminHeading title="Peserta" description="Kelola peserta, pendaftaran, dan angkatan dalam satu tempat." />
    <nav aria-label="Pengelolaan peserta" className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-gray-50 p-2">{[{ id: "daftar", label: "Daftar Peserta" }, { id: "pendaftaran", label: "Pendaftaran" }, { id: "angkatan", label: "Angkatan" }].map(item => <Link key={item.id} href={`/admin/academy/peserta?tab=${item.id}`} aria-current={tab === item.id ? "page" : undefined} className={`rounded-xl px-5 py-3 text-sm font-medium ${tab === item.id ? "bg-green-600 text-white" : "text-gray-600 hover:bg-white"}`}>{item.label}</Link>)}</nav>
    <SavedNotice saved={query.disimpan === "1"} />
    {tab === "angkatan" && <CohortsPanel />}
    {tab === "pendaftaran" && <Card className="max-w-2xl"><CardTitle>Daftarkan peserta</CardTitle><ActionForm action={registerAcademyParticipant} label="Daftarkan Peserta" className="mt-5"><ParticipantRegistrationFields academy /><FormField label="Angkatan" htmlFor="participant-cohort"><Select id="participant-cohort" name="cohortId" required defaultValue={cohort}><option value="" disabled>Pilih angkatan</option>{cohorts.map(item => <option key={item.id} value={item.id}>{item.title} · {item.participants_count} peserta</option>)}</Select></FormField></ActionForm></Card>}
    {data && <><div className="mb-6 grid gap-4 sm:grid-cols-2">{[["IKHWAN", "Ikhwan"], ["AKHWAT", "Akhwat"]].map(([value, label]) => <Link href={`/admin/academy/peserta?group=${value}`} key={value} aria-current={group === value ? "page" : undefined}><Card className={group === value ? "ring-2 ring-green-500" : undefined}><p className="text-sm text-foreground/60">Grup {label}</p><p className="mt-3 text-3xl font-semibold">{data.counts.find(item => item.gender === value)?._count._all ?? 0}</p></Card></Link>)}</div>
      <ParticipantAccounts data={data} q={q} cohort={cohort} group={group} page={page} base="/admin/academy/peserta" groups />
      <details className="mt-8 rounded-2xl border border-gray-100 bg-white p-5"><summary className="cursor-pointer font-semibold">Progres pembelajaran peserta</summary><div className="mt-5"><ParticipantDirectory certificates={false} query={query} /></div></details></>}
  </>;
}
