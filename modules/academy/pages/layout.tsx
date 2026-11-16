import { getAcademyBasePath } from "../pwa/server-navigation";
import { AcademyPwa } from "../pwa/AcademyPwa";
import type { Metadata, Viewport } from "next";
import { getAcademyUser } from "../api/access";
import { AcademyShell } from "../components/AcademyShell";
import { getLearningSettings } from "../api/learning";
import { getLearningOverview } from "../api/courses";
import { getExamNotifications } from "../api/notifications";
import { ReminderRefresh } from "../components/ReminderRefresh";
import "../components/academy.css";
import "../components/dashboard.css";
const academyMetadata: Metadata = {
  manifest: "/academy/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Academy" },
  icons: { icon: "/academy-pwa/icon-192.png", apple: "/academy-pwa/icon-192.png" },
  title: { default: "Insan Academy | LAZSIP", template: "%s | Insan Academy" },
  description: "Belajar bersama Ustadz Irham melalui audio harian, catatan belajar, evaluasi, dan tanya jawab selama satu bulan.",
};
export async function generateMetadata(): Promise<Metadata> {
  const base = await getAcademyBasePath();
  return { ...academyMetadata, manifest: `${base}/manifest.webmanifest`, ...(base === "/academy-app" ? { robots: { index: false, follow: false } } : {}) };
}
export const viewport: Viewport = { themeColor: "#047857", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const basePath = await getAcademyBasePath();
  const user = await getAcademyUser();
  const settings = await getLearningSettings();
  const unread = user?.academyProfile && !user.isTeacher && !user.isSuperadmin ? (await getExamNotifications(user.academyProfile.id)).filter(item => !item.read).length : 0;
  const certificatesAvailable = user?.academyProfile && !user.isTeacher && !user.isSuperadmin ? (await getLearningOverview(user.academyProfile.id)).some(course => course.certificateVisible) : false;
  return <AcademyPwa basePath={basePath}><AcademyShell certificatesAvailable={certificatesAvailable} csPhone={settings.csPhone} unreadReminders={unread} user={user ? { name: user.name, nis: user.academyProfile?.nis ?? null, isTeacher: user.isTeacher, isSuperadmin: user.isSuperadmin } : null}><a href="#academy-content" className="sr-only focus:not-sr-only focus:p-4">Lewati ke konten</a>{user?.academyProfile && !user.isTeacher && !user.isSuperadmin && <ReminderRefresh />}{children}</AcademyShell></AcademyPwa>;
}
