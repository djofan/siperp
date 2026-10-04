import type { Metadata } from "next";
import { getAcademyUser } from "../api/access";
import { AcademyShell } from "../components/AcademyShell";
import { getLearningSettings } from "../api/learning";
import { getExamNotifications } from "../api/notifications";
import { ReminderRefresh } from "../components/ReminderRefresh";
import "../components/academy.css";
export const metadata: Metadata = {
  title: { default: "Insan Academy | LAZSIP", template: "%s | Insan Academy" },
  description: "Belajar bersama Ustadz Irham melalui audio harian, catatan belajar, evaluasi, dan tanya jawab selama satu bulan.",
};
export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const user = await getAcademyUser();
  const settings = await getLearningSettings();
  const unread = user?.academyProfile && !user.isTeacher && !user.isSuperadmin ? (await getExamNotifications(user.academyProfile.id)).filter(item => !item.read).length : 0;
  return <AcademyShell csPhone={settings.csPhone} unreadReminders={unread} user={user ? { name: user.name, nis: user.academyProfile?.nis ?? null, isTeacher: user.isTeacher, isSuperadmin: user.isSuperadmin } : null}><a href="#academy-content" className="sr-only focus:not-sr-only focus:p-4">Lewati ke konten</a>{user?.academyProfile && !user.isTeacher && !user.isSuperadmin && <ReminderRefresh />}{children}</AcademyShell>;
}
