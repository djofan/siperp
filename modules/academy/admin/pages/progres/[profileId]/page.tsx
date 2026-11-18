import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminProgressDetail } from "@/modules/academy/api/admin-progress";
import { AdminHeading } from "@/modules/academy/components/admin/AdminUi";
import { ParticipantProgressDetail } from "@/modules/academy/components/admin/ParticipantProgress";

export default async function Page({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ cohort?: string }> }) {
  await requireAcademyAdmin();
  const [{ profileId }, { cohort }] = await Promise.all([params, searchParams]);
  if (!cohort) notFound();
  const data = await getAdminProgressDetail(profileId, cohort);
  if (!data) notFound();
  return <><AdminHeading title={data.person.name} description="Progres dan nilai ujian peserta." backHref={`/admin/academy/progres?${new URLSearchParams({ cohort, q: data.person.nis ?? "" })}`} /><ParticipantProgressDetail data={data} /></>;
}
