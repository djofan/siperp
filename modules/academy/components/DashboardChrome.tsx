"use client";

import Link from "@/modules/academy/pwa/AcademyNavigation";
import { useAcademyBasePath } from "../pwa/AcademyNavigation";
import { canonicalAcademyPath } from "../pwa/navigation";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Bell, BookOpen, ChevronRight, GraduationCap, Headphones, Heart, LayoutDashboard, Menu, MessageCircle, Settings, Trophy, Users, ClipboardList, Layers, CalendarDays, NotebookPen } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "./ui/sheet";
import { cn } from "./ui/utils";
import { LogoutButton } from "./LogoutButton";

export type DashboardNavGroup = { heading?: string; items: { href: string; label: string; icon?: string }[] };
const icons = { Dashboard: LayoutDashboard, BookOpen, Quiz: ClipboardList, Trophy, GraduationCap, Users, Settings, Progress: Layers };
function navigationIcon(href: string, icon?: string) {
  if (icon && icon in icons) return icons[icon as keyof typeof icons];
  if (href.endsWith("/pengaturan") || href.endsWith("/akun")) return Settings;
  if (href.includes("pengingat")) return Bell;
  if (href.includes("angkatan")) return Layers;
  if (href.includes("pendaftaran")) return CalendarDays;
  if (href.includes("peserta")) return Users;
  if (href.includes("sertifikat")) return GraduationCap;
  if (href.includes("materi") || href.includes("program")) return BookOpen;
  if (href.includes("kuis") || href.includes("ujian")) return ClipboardList;
  if (href.includes("pertanyaan") || href.includes("tanya-jawab")) return MessageCircle;
  if (href.includes("catatan")) return NotebookPen;
  return LayoutDashboard;
}

function activeNavigationHref(pathname: string, role: "Admin" | "Pengajar" | "Peserta") {
  if (role === "Admin" && pathname.startsWith("/admin/academy/participant-edit")) return "/admin/academy/peserta";
  if (role === "Admin" && pathname.startsWith("/admin/academy/program/") && pathname.includes("/kuis/")) return "/admin/academy/kuis";
  if (role === "Admin" && pathname.startsWith("/admin/academy/program")) return "/admin/academy/materi";
  if (role === "Peserta" && pathname.startsWith("/academy/program/")) return "/academy/materi";
  return pathname;
}

export function DashboardChrome({ groups, userName, role, userNumber, unreadReminders = 0, csPhone, children }: {
  groups: DashboardNavGroup[]; userName: string; role: "Admin" | "Pengajar" | "Peserta";
  userNumber?: string | null; unreadReminders?: number; csPhone?: string; children: ReactNode;
}) {
  const pathname = canonicalAcademyPath(usePathname());
  const mobileApp = useAcademyBasePath() === "/academy-app";
  const [open, setOpen] = useState(false);
  const items = groups.flatMap(group => group.items);
  const navigationPathname = activeNavigationHref(pathname, role);
  const active = items.filter(item => navigationPathname === item.href || navigationPathname.startsWith(`${item.href}/`) || (item.href === "/academy/peringkat" && pathname.startsWith("/academy/sertifikat/"))).sort((a, b) => b.href.length - a.href.length)[0];
  const sidebar = <>
    <Link href="/academy" onClick={() => setOpen(false)} className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-6">
      <span className="academy-brand-icon flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><GraduationCap className="size-6" /></span>
      <span><span className="block text-sm font-semibold tracking-tight text-slate-900">Insan Academy</span><span className="mt-0.5 block text-xs text-slate-500">Ruang {role.toLowerCase()}</span></span>
    </Link>
    <nav aria-label={`Menu ${role.toLowerCase()}`} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((group, index) => <div key={group.heading ?? index} className="space-y-1">
        {group.heading && <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">{group.heading}</p>}
        {group.items.map(item => {
          const Icon = navigationIcon(item.href, item.icon);
          const selected = active?.href === item.href;
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={selected ? "page" : undefined}
            className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", selected ? "bg-emerald-50 font-semibold text-emerald-700" : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>
            <Icon className="size-4 shrink-0" /><span className="flex-1">{item.label}</span>
            {item.href === "/academy/pengingat" && unreadReminders > 0 ? <Badge className="px-1.5">{unreadReminders}</Badge> : selected && <ChevronRight className="size-3.5" />}
          </Link>;
        })}
      </div>)}
    </nav>
    {role === "Peserta" ? <Link href="/lazsip/donasi" className="academy-sidebar-note mx-4 mb-4 block shrink-0 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><div className="flex items-center gap-2"><Heart className="size-4 shrink-0 text-emerald-600" /><p className="text-xs font-semibold text-slate-800">Support Donasi</p><ArrowUpRight className="ml-auto size-3 shrink-0" /></div><p className="mt-1 text-xs leading-4 text-slate-600">Dukung kebaikan melalui LAZSIP.</p><span className="mt-1 block text-xs font-semibold text-[var(--academy-lime)]">Donasi sekarang</span></Link> : csPhone && <div className="academy-sidebar-note mx-4 mb-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><Headphones className="mb-2 size-5 text-emerald-600" /><p className="text-xs font-semibold text-slate-800">Butuh bantuan?</p><a href={`https://wa.me/${csPhone}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">Hubungi customer service <ArrowUpRight className="size-3" /></a></div>}
    <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
      <span className="academy-user-avatar flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">{userName.charAt(0).toUpperCase()}</span>
      <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{userName}</p><p className="text-xs text-slate-500">{userNumber ? `NIP ${userNumber}` : role}</p></div>
    </div>
  </>;

  return <Sheet open={open} onOpenChange={setOpen}><div className="academy-theme academy-workspace flex h-dvh overflow-hidden">
    <a href="#academy-content" className="sr-only z-50 focus:not-sr-only focus:absolute focus:rounded-lg focus:bg-white focus:p-3">Lewati ke konten</a>
    <aside className="academy-sidebar hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex print:hidden">{sidebar}</aside>
    <SheetContent side="left" className="academy-theme academy-workspace academy-sidebar flex w-72 flex-col gap-0 bg-white p-0 sm:max-w-72 lg:hidden"><SheetTitle className="sr-only">Navigasi Academy</SheetTitle><SheetDescription className="sr-only">Menu ruang {role.toLowerCase()}</SheetDescription>{sidebar}</SheetContent>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8 print:hidden">
        <div className="flex min-w-0 items-center gap-3"><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Buka menu" className="lg:hidden"><Menu /></Button></SheetTrigger><span className="hidden text-sm text-slate-400 sm:block">Academy</span><ChevronRight className="hidden size-3.5 text-slate-300 sm:block" /><span className="truncate text-sm font-medium text-slate-700">{active?.label ?? "Dashboard"}</span></div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {role === "Peserta" && <Button asChild variant="ghost" size="icon"><Link href="/academy/pengingat" aria-label={`Pengingat ujian${unreadReminders ? `, ${unreadReminders} belum dibaca` : ""}`} className="relative"><Bell />{unreadReminders > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-emerald-500" />}</Link></Button>}
          <LogoutButton compact />
        </div>
      </header>
      <main id="academy-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto w-full max-w-7xl">{children}</div></main>
      {mobileApp && role === "Peserta" && <nav aria-label="Navigasi cepat Academy" className="grid shrink-0 grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">{[
        { href: "/academy/belajar", label: "Beranda", icon: LayoutDashboard },
        { href: "/academy/materi", label: "Materi", icon: BookOpen },
        { href: "/academy/kuis", label: "Ujian", icon: ClipboardList },
        { href: "/academy/akun", label: "Profil", icon: Users },
      ].map(item => <Link key={item.href} href={item.href} aria-current={navigationPathname === item.href || navigationPathname.startsWith(`${item.href}/`) ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs ${navigationPathname === item.href || navigationPathname.startsWith(`${item.href}/`) ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-600"}`}><item.icon className="size-5" /><span>{item.label}</span></Link>)}</nav>}
    </div>
  </div></Sheet>;
}
