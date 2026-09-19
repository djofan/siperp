import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { ParticipantDirectory } from "@/modules/academy/components/admin/ParticipantDirectory";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  return <ParticipantDirectory certificates={false} query={await searchParams} />;
}

