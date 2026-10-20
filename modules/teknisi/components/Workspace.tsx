"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./workspace.css";
import "./lazsip-theme.css";
import "./team-workspace.css";
import "./dashboard.css";

export function Workspace({ name, roleLabel, outletName, accountCode, root, admin = false, children }: { name: string; roleLabel: string; outletName: string; accountCode?: string; root: string; admin?: boolean; children: React.ReactNode }) {
  const path = usePathname(), query = useSearchParams();
  const [open, setOpen] = useState(false), [leaving, setLeaving] = useState(false), [error, setError] = useState("");
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    drawer.current?.querySelector<HTMLElement>("button,a")?.focus();
    return () => previous?.focus();
  }, [open]);
  const links = [
    { href: root, label: admin ? "Overview pusat" : "Dashboard kerja" },
    { href: `${root}/tiket`, label: "Semua servisan" },
    { href: `${root}/tiket?status=received`, label: "Pending" },
    { href: `${root}/tiket?status=repairing`, label: "Sedang diproses" },
    { href: `${root}/tiket?status=ready`, label: "Ready · siap diambil" },
    { href: `${root}/tiket?status=collected`, label: "Finish · sudah diambil" },
    { href: `${root}/tiket?status=cancelled`, label: "Batal" },
    { href: `${root}/laporan`, label: "Ringkasan operasional" },
    { href: `${root}/outlet`, label: admin ? "Outlet" : "Informasi outlet" },
    ...(admin ? [{ href: `${root}/teknisi`, label: "Akun teknisi" }] : [{ href: `${root}/profil`, label: "Profil saya" }]),
  ];
  function active(href: string) {
    if (href.includes("?")) return path === `${root}/tiket` && query.get("status") === href.split("status=")[1];
    if (href === `${root}/tiket`) return (path === href && !query.get("status")) || path.startsWith(`${href}/`);
    return href === root ? path === root : path === href || path.startsWith(`${href}/`);
  }
  function keys(event: React.KeyboardEvent) {
    if (event.key === "Escape") setOpen(false);
    if (event.key !== "Tab") return;
    const items = Array.from(drawer.current?.querySelectorAll<HTMLElement>("a,button") ?? []), first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  async function logout() {
    setLeaving(true); setError("");
    try { const response = await fetch("/api/auth/logout", { method: "POST", headers: { Accept: "application/json" } }); if (!response.ok) throw new Error(); window.location.assign(admin ? "/admin/login" : "/teknisi/masuk"); }
    catch { setLeaving(false); setError("Belum berhasil keluar. Silakan coba lagi."); }
  }
  return <div className={`tech-workspace ${admin ? "tech-central" : "tech-operator"}`}>
    <a className="sr-only focus:not-sr-only" href="#tech-main">Lewati ke konten</a>
    {open && <button className="tech-backdrop" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    <aside ref={drawer} role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Navigasi Teknisi HP" onKeyDown={keys} className={`tech-sidebar ${open ? "is-open" : ""}`}>
      <Link href={root} className="tech-brand">Teknisi<span>HP</span></Link><p className="tech-subtitle">{admin ? "Pusat pengelolaan" : "Workspace teknisi"}</p>
      <div className="tech-scope-card"><small>{roleLabel}</small><strong>{name}</strong><span>{accountCode ?? "Akun pengelola"}</span><span>{admin ? "Cakupan" : "Outlet"} · {outletName}</span></div>
      <button className="tech-mobile-close" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button>
      <nav aria-label="Menu Teknisi HP">{links.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={active(item.href) ? "is-active" : ""} aria-current={active(item.href) ? "page" : undefined}>{item.label}</Link>)}</nav>
      <div className="tech-account"><span>{admin ? "Kontrol lintas outlet" : "Operasional outlet"}</span>{admin && <Link href="/admin">← Kembali ke Core</Link>}</div>
    </aside>
    <div className="tech-frame"><header className="tech-topbar"><button className="tech-mobile-menu" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}>☰</button><span className="tech-topbar-context"><strong>{admin ? "Panel pusat" : outletName}</strong><small>{name} · {accountCode ?? roleLabel}</small></span><div><Link href="/teknisi">Lihat website ↗</Link><button disabled={leaving} onClick={logout}>{leaving ? "Memproses…" : "Keluar"}</button></div></header>{error && <p role="alert">{error}</p>}<main id="tech-main" className="tech-main">{children}</main></div>
  </div>;
}
