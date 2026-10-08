"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Icon, type IconName } from "@/modules/tanwir/components/icons";
import { Avatar } from "@/modules/tanwir/components/ui";

interface NavItem { href: string; label: string; icon: IconName }
export function AdminShell({ userName, nav, children }: { userName: string; nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const matches = nav.filter(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  const activeHref = matches.reduce((best, item) => item.href.length > best.length ? item.href : best, "");
  const pageTitle = nav.find(item => item.href === activeHref)?.label ?? "Tanwir Qurani";
  function close() { setOpen(false); menuButton.current?.focus(); }
  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (!value) return;
    const match = nav.find(item => item.label.toLowerCase().includes(value));
    if (match) { router.push(match.href); setQuery(""); }
  }
  const sidebar = (mobile = false) => <div className="learning-sidebar admin-sidebar flex h-full w-64 shrink-0 flex-col py-2">
    <div className="sidebar-brand flex shrink-0 items-center px-5 py-4"><Link href="/admin/tanwir" className="flex items-center gap-3"><span className="admin-brand-symbol"><Icon name="emblem" className="h-5 w-5" /></span><span><span className="block font-[family-name:var(--font-tanwir-serif)] text-xl leading-tight">Tanwir Qurani</span><span className="block text-[11px] text-tanwir-muted">Panel admin</span></span></Link></div>
    <nav aria-label={mobile ? "Menu admin seluler" : "Menu admin"} className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
      {nav.map((item, index) => <div key={item.href}>
        {(index === 0 || index === 1 || item.href === "/admin") && <p className="nav-group px-3 pb-2 pt-4 text-xs text-tanwir-muted">{index === 0 ? "Ringkasan" : item.href === "/admin" ? "Platform" : "Pengelolaan"}</p>}
        <Link href={item.href} onClick={mobile ? close : undefined} title={item.label} aria-label={item.label}
          aria-current={activeHref === item.href ? "page" : undefined} className="learning-nav-item">
          <Icon name={item.icon} className="h-4 w-4 shrink-0" /><span className="nav-label">{item.label}</span>
        </Link>
      </div>)}
    </nav>
    <div className="sidebar-account flex shrink-0 items-center gap-3 px-5 py-3">
      <Avatar name={userName} size={34} />
      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{userName}</span><span className="block text-[10px] text-tanwir-muted">Admin</span></span>
      <button type="button" disabled={leaving} onClick={logout} aria-label="Keluar" className="rounded-full p-2 disabled:opacity-50"><Icon name="logout" className="h-4 w-4" /></button>
    </div>
  </div>;
  return <div className={`admin-shell relative flex h-dvh overflow-hidden ${collapsed && !open ? "is-collapsed" : ""}`}>
    <a href="#tanwir-admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:p-3">Lewati ke konten</a>
    <div className="hidden shrink-0 lg:block">{sidebar()}</div>
    {open && <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Tutup menu" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Navigasi admin" className="admin-drawer absolute inset-y-0 left-0 w-64"
        onKeyDown={event => {
          if (event.key === "Escape") close();
          if (event.key === "Tab") {
            const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a,button:not(:disabled)"));
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <button type="button" autoFocus onClick={close} aria-label="Tutup menu" className="absolute right-3 top-5 rounded-full p-2"><Icon name="x" className="h-4 w-4" /></button>
        {sidebar(true)}
      </div>
    </div>}
    <div className="admin-frame relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="learning-bar admin-topbar flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button ref={menuButton} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Buka menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full lg:hidden"><Icon name="menu" /></button>
        <button type="button" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "Perluas sidebar" : "Ringkas sidebar"} className="hidden h-11 w-11 shrink-0 items-center justify-center lg:flex"><Icon name="menu" /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-xs text-tanwir-muted">Tanwir Qurani / Admin / <span className="text-tanwir-ink">{pageTitle}</span></p></div>
        <form onSubmit={search} className="admin-menu-search hidden max-w-xs items-center px-4 py-1 lg:flex">
          <input value={query} onChange={event => setQuery(event.target.value)} aria-label="Cari menu admin"
            placeholder="Cari menu..." className="min-w-0 w-full bg-transparent text-sm outline-none" />
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/tanwir" title="Lihat situs" className="rounded-full px-3 py-2 text-xs">Lihat situs ↗</Link>
        </div>
      </header>
      <main id="tanwir-admin-content" className="learning-content min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  </div>;
}
