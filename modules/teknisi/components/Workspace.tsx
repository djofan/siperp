"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./workspace.css";
import "./lazsip-theme.css";
import "./team-workspace.css";
import "./dashboard.css";
import "./form-controls.css";
import "./service-list.css";
import "./service-card.css";
import "./central-theme.css";
import "./operator-theme.css";
import styles from "./WorkspaceIdentity.module.css";
import { selectedServiceMenu } from "../api/workflow";
import { LayoutDashboard, Wrench, Clock3, CircleCheck, PackageCheck, CircleX, ChartNoAxesCombined, Store, UsersRound, UserRound, ListFilter, ChevronRight } from "lucide-react";

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
  const menuIcons = [LayoutDashboard,ListFilter,Clock3,Wrench,PackageCheck,CircleCheck,CircleX,ChartNoAxesCombined,Store,admin?UsersRound:UserRound];

  function active(href: string) {
    const selected=selectedServiceMenu(path, root, query.get("status"));
    if (href.includes("?")) return selected === href.split("status=")[1];
    if (href === `${root}/tiket`) return !selected && (path === href || path.startsWith(`${href}/`));
    return href === root ? path === root : path === href || path.startsWith(`${href}/`);
  }
  const pageLabel = path === `${root}/tiket/baru` ? "Buat servisan" : links.find(item => active(item.href))?.label ?? "Detail servisan";
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
    <aside ref={drawer} role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Navigasi Teknisi HP" onKeyDown={keys} className={`tech-sidebar ${styles.sidebar} ${open ? "is-open" : ""}`}>
      <Link href={root} className="tech-brand">Teknisi<span>HP</span></Link><p className="tech-subtitle">{admin ? "Pusat pengelolaan" : "Workspace teknisi"}</p>
      <button className="tech-mobile-close" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button>
      <nav aria-label="Menu Teknisi HP">{links.map((item,index) => {const MenuIcon=menuIcons[index];return <div className={styles.navItem} key={item.href}>
        {[0,2,7].includes(index)&&<p className={styles.groupLabel}>{index===0?"Ruang kerja":index===2?"Antrean servis":"Pengelolaan"}</p>}
        <Link href={item.href} onClick={() => setOpen(false)} className={`${styles.navLink} ${active(item.href)?"is-active":""}`} aria-current={active(item.href) ? "page" : undefined}><MenuIcon size={17} strokeWidth={1.7} aria-hidden="true"/><span className={styles.navText}><span>{item.label.replace("Ready · siap diambil","Siap diambil").replace("Finish · sudah diambil","Selesai diambil")}</span></span>{active(item.href)&&<ChevronRight size={13} aria-hidden="true"/>}</Link>
      </div>;})}</nav>
      {!admin&&<div className={`tech-account ${styles.footer}`}><span>Operasional outlet</span></div>}
    </aside>
    <div className="tech-frame"><header className={`tech-topbar ${styles.header}`}><button className="tech-mobile-menu" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}>☰</button>{!admin&&<div className={styles.context} aria-label="Halaman dan outlet aktif"><span className={styles.contextLabel}>Workspace teknisi<span aria-hidden="true"> / </span><strong>{pageLabel}</strong></span><span className={styles.contextOutlet} title={outletName}>{outletName}</span></div>}<div className={styles.actions}>{admin&&<Link href="/admin" className={styles.coreButton} aria-label="Kembali ke Core"><LayoutDashboard size={15} aria-hidden="true"/><span className={styles.coreLabel}>Kembali ke Core</span><span className={styles.coreLabelMobile}>Core</span></Link>}<details className={styles.accountMenu}><summary><span className={styles.accountAvatar} aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span><span className={styles.accountName}><strong>{name}</strong><small>{roleLabel}</small></span><ChevronRight size={13} aria-hidden="true"/></summary><div className={styles.accountDropdown}><strong>{name}</strong><small>{accountCode??roleLabel}</small><span><Store size={14}/>{outletName}</span></div></details>{!admin&&<Link href="/akun/password">Ubah password</Link>}<Link href="/teknisi">Lihat website ↗</Link><button disabled={leaving} onClick={logout}>{leaving ? "Memproses…" : "Keluar"}</button></div></header>{error && <p role="alert">{error}</p>}<main id="tech-main" className="tech-main">{children}</main></div>
  </div>;
}
