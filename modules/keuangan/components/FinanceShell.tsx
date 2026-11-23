"use client";
import { formatNumericText } from "@/lib/number-format";


import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wallet, LayoutDashboard, FileText, CheckCheck, Settings, ArrowLeft, Menu, X, LogOut, Bell, ArrowUpRight } from "lucide-react";
import type { KeuanganOverview } from "@/contracts/modules/keuangan";

export function FinanceShell({ name, role, permissions, showCore, pendingApprovals, children }: {
  name: string; role: string; permissions: KeuanganOverview["permissions"]; showCore: boolean; pendingApprovals: number | null; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const notifications = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (notifications.current && event.target instanceof Node && !notifications.current.contains(event.target)) notifications.current.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  useEffect(() => {
    if (!["/admin/keuangan", "/admin/keuangan/approval"].includes(pathname)) return;
    const interval = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 60000);
    return () => clearInterval(interval);
  }, [router, pathname]);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const nav = [
    { href: "/admin/keuangan", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/keuangan/pengeluaran", label: "Pengajuan Keuangan", icon: FileText },
    ...(permissions.readApprovals ? [{ href: "/admin/keuangan/approval", label: "Approval Saya", icon: CheckCheck }] : []),
    ...(permissions.readMasters ? [{ href: "/admin/keuangan/pengaturan", label: "Program & Pengaturan", icon: Settings }] : []),
  ];
  const active = [...nav].reverse().find(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  async function logout() {
    setLeaving(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/admin/login"); router.refresh();
    } catch { setError("Belum dapat keluar. Silakan coba lagi."); setLeaving(false); }
  }
  return <div className={`finance-workspace finance-shell ${open ? "finance-menu-open" : ""}`}>
    <a className="finance-skip" href="#finance-content">Lewati ke konten</a>
    <aside className="finance-sidebar" id="finance-navigation" aria-label="Navigasi Keuangan">
      <Link className="finance-brand" href="/admin/keuangan" onClick={() => setOpen(false)}><span className="finance-brand-icon"><Wallet size={23}/></span><span><strong>Keuangan SIP</strong><small>Pengajuan & persetujuan</small></span></Link>
      <p className="finance-nav-heading">RUANG KERJA</p>
      <nav aria-label="Menu Keuangan">{nav.map(item => <Link key={item.href} href={item.href} aria-current={active?.href === item.href ? "page" : undefined} onClick={() => setOpen(false)}><item.icon size={18}/><span>{item.label}</span></Link>)}</nav>
      {showCore && <><p className="finance-nav-heading">PLATFORM</p><Link className="finance-core-link" href="/admin/modul"><ArrowLeft size={17}/> Pilih modul lain</Link></>}
      <div className="finance-account"><span className="finance-avatar" aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join("")}</span><span><strong>{name}</strong><small>{role}</small></span><button type="button" onClick={logout} disabled={leaving} aria-label="Keluar dari akun"><LogOut size={18}/></button></div>
      {error && <p role="alert">{error}</p>}
    </aside>
    <div className="finance-main"><header className="finance-topbar"><button className="finance-menu-toggle" type="button" aria-expanded={open} aria-controls="finance-navigation" aria-label={open ? "Tutup menu" : "Buka menu"} onClick={() => setOpen(!open)}>{open ? <X size={21}/> : <Menu size={21}/>}</button><strong>{active?.label ?? "Keuangan"}</strong><div className="finance-topbar-actions"><details ref={notifications} className="finance-notifications" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary aria-label={`Notifikasi Keuangan${pendingApprovals ? `: ${pendingApprovals} approval menunggu` : ""}`}><Bell size={20}/>{!!pendingApprovals&&<span className="finance-notification-count">{formatNumericText(pendingApprovals > 99 ? "99+" : pendingApprovals)}</span>}</summary><div className="finance-notification-popover"><strong>Notifikasi Keuangan</strong><small>Ringkasan tugas Anda saat ini</small>{permissions.readApprovals ? <><p>{pendingApprovals ? `${pendingApprovals.toLocaleString("id-ID")} pengajuan menunggu keputusan Anda.` : "Tidak ada approval yang menunggu keputusan Anda."}</p><Link href="/admin/keuangan/approval" onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>Buka Approval Saya <ArrowUpRight size={15}/></Link></> : <p>Pantau pengajuan dan status persetujuan di halaman Pengajuan Keuangan.</p>}<Link href="/admin/keuangan/pengeluaran" onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>Lihat pengajuan <ArrowUpRight size={15}/></Link></div></details><span className="finance-role-badge">{role}</span></div></header><main id="finance-content" className="finance-content">{children}</main></div>
  </div>;
}
