"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";


const links = [
  { href: "/teknisi/panel", label: "Dashboard Outlet" },
  { href: "/teknisi/panel/tiket", label: "Tiket Servis" },
  { href: "/teknisi/panel/sparepart", label: "Sparepart" },
  { href: "/teknisi/panel/outlet", label: "Informasi Outlet" },
  { href: "/teknisi/panel/profil", label: "Profil Saya" },
];
export function OperatorShell({ user, outletName, children }: { user: { name: string; nip: string }; outletName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const active = links.filter(item => pathname === item.href || pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  async function logout() {
    setLeaving(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reload the document after cookie revocation so authenticated route-prefetch state is discarded.
      window.location.assign("/teknisi/masuk");
    }
    catch { setLeaving(false); setError("Belum berhasil keluar. Coba lagi."); }
  }
  const sidebar = (mobile = false) => <div className="flex h-full flex-col px-4 py-6"><Link href="/teknisi/panel" onClick={() => setOpen(false)} className="px-3 text-xl font-bold text-white">Teknisi<span className="text-accent">HP.</span></Link><p className="mt-2 px-3 text-xs text-white/50">Panel Outlet · {outletName}</p><nav aria-label={mobile ? "Menu outlet seluler" : "Menu outlet"} className="mt-8 flex-1 space-y-2">{links.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active === item.href ? "page" : undefined} className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${active === item.href ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>{item.label}</Link>)}</nav><div className="border-t border-white/10 px-3 pt-5"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="mt-2 font-mono text-xs text-accent">{user.nip}</p><p className="mt-1 text-xs text-white/40">Teknisi outlet</p></div></div>;
  return <div className="dark flex h-dvh overflow-hidden bg-[#0b1009] text-foreground"><a href="#operator-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-surface focus:p-3">Lewati ke konten</a><aside className="hidden w-64 shrink-0 border-r border-white/5 lg:block">{sidebar()}</aside>{open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} /><aside role="dialog" aria-modal="true" aria-label="Navigasi outlet" className="absolute inset-y-0 left-0 w-64 bg-[#0b1009]" onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}><button autoFocus type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-white">×</button>{sidebar(true)}</aside></div>}<div className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-4 sm:px-6"><button type="button" aria-label="Buka menu outlet" aria-expanded={open} onClick={() => setOpen(true)} className="rounded-lg p-2 text-white lg:hidden"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{outletName}</p><p className="text-xs text-foreground/50">Ruang kerja teknisi</p></div><button type="button" disabled={leaving} onClick={logout} aria-label="Keluar" className="shrink-0 rounded-lg px-2 py-2 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 sm:hidden"><path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5V3h4m5 4 5 5-5 5m-4-5h9" /></svg><span className="hidden sm:inline">{leaving ? "Memproses…" : "Keluar"}</span></button></header>{error && <p role="alert" className="px-6 pt-3 text-sm text-danger">{error}</p>}<main id="operator-content" className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main></div></div>;
}
