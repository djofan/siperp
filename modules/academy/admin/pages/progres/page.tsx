import { requireAcademyAdmin } from "../../../api/admin-access";
import { getAdminProgress } from "../../../api/admin-progress";
import { AdminHeading } from "../../../components/admin/AdminUi";
import { ParticipantProgressDirectory } from "../../../components/admin/ParticipantProgress";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const cohort = typeof query.cohort === "string" ? query.cohort : "";
  const group = query.group === "IKHWAN" || query.group === "AKHWAT" ? query.group : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = await getAdminProgress(new URLSearchParams({ q: search, cohort, group, page: String(page) }));
  return <><AdminHeading title="Progres Peserta" description="Pantau penyelesaian ujian dan nilai seluruh peserta per angkatan." /><ParticipantProgressDirectory data={data} search={search} group={group} /></>;
}
