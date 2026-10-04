import { requireAcademyProfile } from "../../api/access";
import { getExamNotifications } from "../../api/notifications";
import { ExamReminders } from "../../components/ExamReminders";
import { PageHeading, EmptyState } from "../../components/ui";
export default async function RemindersPage() {
  const { profileId } = await requireAcademyProfile();
  const items = await getExamNotifications(profileId);
  return <div className="mx-auto max-w-4xl p-4 md:p-8"><PageHeading title="Pengingat ujian">Jadwal terdekat, ujian yang tersedia, dan batas pengerjaan program Anda.</PageHeading>{items.length ? <ExamReminders items={items} /> : <EmptyState>Tidak ada pengingat ujian saat ini.</EmptyState>}</div>;
}
