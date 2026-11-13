"use client";
import { canonicalAcademyPath } from "../pwa/navigation";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Navbar } from "./landing/navbar";
import { Footer } from "./landing/footer";
import { publicNavigation } from "./public-navigation";
import { DashboardChrome } from "./DashboardChrome";
const links = [
  { path: "belajar", label: "Dashboard", icon: "Dashboard" },
  { path: "materi", label: "Materi Belajar", icon: "BookOpen" },
  { path: "catatan", label: "Catatan Belajar", icon: "BookOpen" },
  { path: "kuis", label: "Ujian Saya", icon: "Quiz" },
  { path: "progres", label: "Progres Saya", icon: "Progress" },
  { path: "peringkat", label: "Peringkat", icon: "Trophy" },
  { path: "tanya-jawab", label: "Tanya Ustadz", icon: "Users" },
  { path: "akun", label: "Profil", icon: "Users" },
] as const;
const teacherLinks = [
  { path: "/pasang", label: "Pasang Aplikasi", icon: "Settings" },
  { path: "", label: "Dashboard Pengajar", icon: "Dashboard" },
  { path: "/materi", label: "Materi Teks & Audio", icon: "BookOpen" },
  { path: "/ujian", label: "Soal & Ujian", icon: "Quiz" },
  { path: "/pertanyaan", label: "Pertanyaan Peserta", icon: "Users" },
  { path: "/nilai", label: "Nilai Peserta", icon: "Trophy" },
] as const;
const adminLinks = [
  { path: "", label: "Dashboard", icon: "Dashboard" },
  { path: "/materi", label: "Materi", icon: "BookOpen" },
  { path: "/kuis", label: "Ujian", icon: "Quiz" },
  { path: "/peserta", label: "Peserta", icon: "Users" },
  { path: "/sertifikat", label: "Sertifikat", icon: "GraduationCap" },
  { path: "/pengaturan", label: "Pengaturan", icon: "Settings" },
  { path: "/pendaftaran", label: "Pendaftaran", icon: "Users" },
  { path: "/angkatan", label: "Angkatan", icon: "Users" },
] as const;
export function AcademyShell({ user, children, admin = false, csPhone = "628111186626", unreadReminders = 0, certificatesAvailable = false }: { user: { name: string; nis: string | null; isTeacher?: boolean; isSuperadmin?: boolean } | null; children: ReactNode; admin?: boolean; csPhone?: string; unreadReminders?: number; certificatesAvailable?: boolean }) {
  const pathname = canonicalAcademyPath(usePathname());
  const auth = pathname === "/academy/masuk" || pathname === "/academy/daftar";
  const publicPage = publicNavigation.some(item => item.href !== "/academy/program" && pathname === item.href);
  const dashboard = admin || (!publicPage && (!auth && pathname !== "/academy" && pathname !== "/academy/pemeliharaan" && (!!user || links.some(({ path }) => path !== "materi" && pathname.startsWith(`/academy/${path}`)))));
  const navigation: { href: string; label: string; icon: "Dashboard" | "BookOpen" | "Progress" | "Quiz" | "Trophy" | "GraduationCap" | "Users" | "Settings" }[] = admin ? adminLinks.map(item => ({ ...item, href: `/admin/academy${item.path}` })) : links.map(item => ({ ...item, href: `/academy/${item.path}` }));
  if (!admin && !user?.isTeacher && !user?.isSuperadmin && certificatesAvailable) {
    const position = navigation.findIndex(item => item.href === "/academy/peringkat");
    navigation.splice(position + 1, 0, { href: "/academy/sertifikat", label: "Sertifikat", icon: "GraduationCap" });
  }
  if (!admin && (user?.isTeacher || user?.isSuperadmin)) navigation.splice(0, navigation.length, ...teacherLinks.map(item => ({ ...item, href: item.path === "/pasang" ? "/academy/pasang" : `/academy/pengajar${item.path}` })));
  if (auth) return <div className={`academy-theme academy-public academy-auth flex min-h-dvh items-center justify-center bg-gray-50 px-4 ${pathname === "/academy/masuk" ? "py-6" : "py-12"}`}><main id="academy-content" className="w-full">{children}</main></div>;
  if (!dashboard) return <div className="academy-theme academy-public flex min-h-screen flex-col bg-white text-gray-900"><Navbar isLoggedIn={!!user} dashboardHref={user?.isTeacher ? "/academy/pengajar" : "/academy/belajar"} /><main id="academy-content" className="flex-1 pt-14">{children}</main><Footer /></div>;
  return <DashboardChrome groups={[{ heading: "Menu utama", items: navigation }]} userName={user?.name ?? "Peserta"} userNumber={user?.nis} role={admin ? "Admin" : user?.isTeacher || user?.isSuperadmin ? "Pengajar" : "Peserta"} csPhone={csPhone} unreadReminders={unreadReminders}>{children}</DashboardChrome>;
}
