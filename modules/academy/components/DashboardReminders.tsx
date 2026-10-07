import Link from "next/link";
import { getExamNotifications } from "../api/notifications";
import { ExamReminders } from "./ExamReminders";
export async function DashboardReminders({ profileId }: { profileId?: string }) {
  if (!profileId) return null;
  const items = await getExamNotifications(profileId);
  if (!items.length) return null;
  return <section className="mb-8"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Ujian terdekat</h2><Link href="/academy/pengingat" className="text-sm text-green-700">Semua pengingat →</Link></div><ExamReminders items={items} compact /></section>;
}
