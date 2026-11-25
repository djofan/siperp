"use client";
import { usePathname } from "next/navigation";
import styles from "./Admin.module.css";
import { PublicWebsiteLink } from "@/components/admin-shell/PublicWebsiteLink";

export function SarsipTopbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const path=usePathname().split("/")[3]??"";
  const label:Record<string,string>={campaign:"Campaign",berita:"Berita",kegiatan:"Kegiatan",transaksi:"Transaksi",beneficiary:"Bantuan",donatur:"Donatur",profil:"Profil tim"};
  return (
    <header className={`${styles.topbar} flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6 lg:px-8`}>
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      <div className={`${styles.topbarTitle} min-w-0 flex-1 truncate`}>SARSIP <span className="px-2 opacity-40">/</span> <strong>{label[path]??"Dashboard"}</strong></div><span className={`${styles.topbarTag} hidden sm:block`}>Admin panel</span>
      <PublicWebsiteLink href="/sarsip" className="text-white/80 hover:text-white" />
    </header>
  );
}
