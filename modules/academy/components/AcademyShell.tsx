"use client";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Navbar } from "./landing/navbar";
import { Footer } from "./landing/footer";
import { publicNavigation } from "./public-navigation";
import { DashboardChrome } from "./DashboardChrome";
const links = [
  { path: "belajar", label: "Dashboard", icon: "Dashboard" },
  { path: "angkatan", label: "Angkatan Saya", icon: "Users" },
  { path: "materi", label: "Materi", icon: "BookOpen" },
  { path: "progres", label: "Kemajuan Saya", icon: "Progress" },
  { path: "kuis", label: "Ujian Saya", icon: "Quiz" },
  { path: "pengingat", label: "Pengingat Ujian", icon: "Quiz" },
  { path: "peringkat", label: "Peringkat Saya", icon: "Trophy" },
  { path: "sertifikat", label: "Sertifikat Saya", icon: "GraduationCap" },
  { path: "catatan", label: "Catatan Belajar", icon: "BookOpen" },
  { path: "tanya-jawab", label: "Tanya Jawab Ustadz", icon: "Users" },
  { path: "akun", label: "Ganti Password", icon: "Settings" },
] as const;
const teacherLinks = [
  { path: "", label: "Dashboard Pengajar", icon: "Dashboard" },
  { path: "/materi", label: "Materi Teks & Audio", icon: "BookOpen" },
  { path: "/ujian", label: "Soal & Ujian", icon: "Quiz" },
  { path: "/pertanyaan", label: "Pertanyaan Peserta", icon: "Users" },
  { path: "/nilai", label: "Nilai Peserta", icon: "Trophy" },
] as const;
const adminLinks = [
  { path: "", label: "Dashboard", icon: "Dashboard" },
  { path: "/program", label: "Program & Modul", icon: "BookOpen" },
  { path: "/kuis", label: "Kuis", icon: "Quiz" },
  { path: "/peserta", label: "Pengguna", icon: "Users" },
  { path: "/sertifikat", label: "Sertifikat", icon: "GraduationCap" },
  { path: "/pengaturan", label: "Pengaturan", icon: "Settings" },
  { path: "/pendaftaran", label: "Pendaftaran & Grup", icon: "Users" },
  { path: "/angkatan", label: "Angkatan", icon: "Users" },
] as const;
export function AcademyShell({ user, children, admin = false, csPhone = "628111186626", unreadReminders = 0 }: { user: { name: string; nis: string | null; isTeacher?: boolean; isSuperadmin?: boolean } | null; children: ReactNode; admin?: boolean; csPhone?: string; unreadReminders?: number }) {
  const pathname = usePathname();
  const auth = pathname === "/academy/masuk" || pathname === "/academy/daftar";
  const publicPage = publicNavigation.some(item => item.href !== "/academy/program" && pathname === item.href);
  const dashboard = admin || (!publicPage && (!auth && pathname !== "/academy" && pathname !== "/academy/pemeliharaan" && (!!user || links.some(({ path }) => path !== "materi" && pathname.startsWith(`/academy/${path}`)))));
  const navigation: { href: string; label: string; icon: "Dashboard" | "BookOpen" | "Progress" | "Quiz" | "Trophy" | "GraduationCap" | "Users" | "Settings" }[] = admin ? adminLinks.map(item => ({ ...item, href: `/admin/academy${item.path}` })) : links.map(item => ({ ...item, href: `/academy/${item.path}` }));
  if (!admin && (user?.isTeacher || user?.isSuperadmin)) navigation.splice(0, navigation.length, ...teacherLinks.map(item => ({ ...item, href: `/academy/pengajar${item.path}` })));
  if (auth) return <div className={`academy-public flex min-h-dvh items-center justify-center bg-gray-50 px-4 ${pathname === "/academy/masuk" ? "py-6" : "py-12"}`}><main id="academy-content" className="w-full">{children}</main></div>;
  if (!dashboard) return <div className="academy-public flex min-h-screen flex-col bg-white text-gray-900"><Navbar isLoggedIn={!!user} dashboardHref={user?.isTeacher ? "/academy/pengajar" : "/academy/belajar"} /><main id="academy-content" className="flex-1 pt-14">{children}</main><Footer /></div>;
  return <DashboardChrome groups={[{ heading: "Menu utama", items: navigation }]} userName={user?.name ?? "Peserta"} userNumber={user?.nis} role={admin ? "Admin" : user?.isTeacher || user?.isSuperadmin ? "Pengajar" : "Peserta"} csPhone={csPhone} unreadReminders={unreadReminders}>{children}</DashboardChrome>;
}
