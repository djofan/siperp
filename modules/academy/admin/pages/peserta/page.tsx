import { redirect } from "next/navigation";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { academyPage } from "../../../api/page-data";
import type { AcademyPage1 } from "../../../api/page-contracts";
import { ParticipantAccounts } from "../../../components/admin/ParticipantAccounts";
import { AdminHeading, SavedNotice } from "../../../components/admin/AdminUi";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  // Keep old bookmarks working while each sidebar menu owns its own page.
  if (query.tab === "pendaftaran" || query.tab === "angkatan") {
    const params = new URLSearchParams();
    for (const key of ["cohort", "disimpan"]) if (typeof query[key] === "string") params.set(key, query[key]);
    redirect(`/admin/academy/${query.tab}${params.size ? `?${params}` : ""}`);
  }
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const cohort = typeof query.cohort === "string" ? query.cohort : "";
  const group = query.group === "IKHWAN" || query.group === "AKHWAT" ? query.group : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = await academyPage<AcademyPage1>(`academy/admin/intake?${new URLSearchParams({ q, cohort, group, page: String(page) })}`);
  return <>
    <AdminHeading title="Peserta" description="Lihat dan kelola daftar peserta Academy." />
    <SavedNotice saved={query.disimpan === "1"} />
    <ParticipantAccounts data={data} q={q} cohort={cohort} group={group} page={page} base="/admin/academy/peserta" groups />
  </>;
}
