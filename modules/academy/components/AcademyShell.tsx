"use client";
/* eslint-disable @next/next/no-img-element -- Logo lokal dari project referensi. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Navbar } from "./landing/navbar";
import { Footer } from "./landing/footer";
import { AcademyIcon, Menu, X } from "./icons";
import { LogoutButton } from "./LogoutButton";
const links = [
  { path: "belajar", label: "Dashboard", icon: "Dashboard" },
  { path: "program", label: "Materi Belajar", icon: "BookOpen" },
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
  const [open, setOpen] = useState(false);
  const auth = pathname === "/academy/masuk" || pathname === "/academy/daftar";
  const dashboard = admin || (!auth && pathname !== "/academy" && pathname !== "/academy/pemeliharaan" && (!!user || links.some(({ path }) => path !== "program" && pathname.startsWith(`/academy/${path}`))));
  const navigation: { href: string; label: string; icon: "Dashboard" | "BookOpen" | "Progress" | "Quiz" | "Trophy" | "GraduationCap" | "Users" | "Settings" }[] = admin ? adminLinks.map(item => ({ ...item, href: `/admin/academy${item.path}` })) : links.map(item => ({ ...item, href: `/academy/${item.path}` }));
  if (!admin && (user?.isTeacher || user?.isSuperadmin)) navigation.splice(0, navigation.length, ...teacherLinks.map(item => ({ ...item, href: `/academy/pengajar${item.path}` })));
  const active = (href: string) => href === "/admin/academy" || href === "/academy/pengajar" ? pathname === href : pathname.startsWith(href);
  const logo = <Link href="/academy" className="flex items-center gap-2.5 font-semibold text-gray-900"><img src="/academy/logo-lazsip.webp" alt="LAZSIP" className="h-7 w-7 object-contain" />Insan Academy</Link>;
  if (auth) return <div className="academy-public flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12"><main id="academy-content" className="w-full">{children}</main></div>;
  if (!dashboard) return <div className="academy-public flex min-h-screen flex-col bg-white text-gray-900"><Navbar isLoggedIn={!!user} dashboardHref={user?.isTeacher ? "/academy/pengajar" : "/academy/belajar"} /><main id="academy-content" className="flex-1 pt-14">{children}</main><Footer /></div>;
  return <div className={`academy-public academy-dashboard ${admin ? "academy-admin" : ""} min-h-screen bg-gray-50 text-gray-900`}>
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 md:hidden print:hidden">{logo}<button aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-lg p-2">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></header>
    {open && <button aria-label="Tutup menu" onClick={() => setOpen(false)} className="fixed inset-0 top-14 z-30 bg-black/20 md:hidden" />}
    <aside className={`${open ? "flex" : "hidden"} fixed bottom-0 top-14 z-40 w-64 flex-col border-r border-gray-100 bg-white md:top-0 md:flex print:hidden`}>
      <div className="flex h-14 items-center border-b border-gray-100 px-5">{logo}</div>
      {admin && <p className="border-b border-gray-100 px-5 py-2 text-xs font-medium uppercase tracking-widest text-gray-400">Panel Admin</p>}
      <nav aria-label={admin ? "Menu admin" : user?.isTeacher || user?.isSuperadmin ? "Menu pengajar" : "Menu peserta"} className="flex-1 space-y-0.5 overflow-y-auto p-3">{navigation.map(({ href, label, icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active(href) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active(href) ? "bg-green-600 text-white shadow-sm shadow-green-200" : "text-gray-600 hover:bg-gray-50"}`}><AcademyIcon name={icon} className="h-4 w-4" />{label}{href === "/academy/pengingat" && unreadReminders > 0 && <span className="ml-auto rounded-full bg-orange-100 px-2 text-xs text-orange-800">{unreadReminders}</span>}</Link>)}{admin && <div className="mt-4 border-t border-gray-100 pt-3"><Link href="/admin" className="block rounded-xl px-3 py-2.5 text-sm text-gray-500">Dashboard Core</Link><Link href="/academy" className="block rounded-xl px-3 py-2.5 text-sm text-gray-500">Lihat Academy ↗</Link></div>}</nav>
      {user && <div className="border-t border-gray-100 p-3"><div className="mb-2 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{user.name.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="font-mono text-xs text-gray-400">{user.nis ?? "-"}</p></div></div><LogoutButton /></div>}
      <a href={`https://wa.me/${csPhone}`} target="_blank" rel="noopener noreferrer" className="block border-t border-gray-100 px-5 py-3 text-xs font-medium text-green-700">Hubungi CS · +{csPhone} ↗</a>
    </aside>
    <main id="academy-content" className={`${admin ? "p-4 md:p-6" : ""} md:ml-64 print:ml-0`}>{children}</main>
  </div>;
}
