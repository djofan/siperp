import Link from "next/link";
import styles from "./site.module.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={styles.site}><header><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"><Link href="/teknisi" className="text-lg font-semibold">Teknisi<span className="text-[#a9d686]">HP.</span></Link><nav className="flex flex-wrap gap-5 text-xs text-[#b5c4ba]"><Link href="/teknisi/cek-status">Cek Status Servis</Link><Link href="/teknisi/panel">Panel Outlet</Link><Link href="/teknisi/masuk">Masuk Teknisi</Link></nav></div></header><main>{children}</main><footer className="mx-auto max-w-6xl px-6 py-5 text-xs">Teknisi HP · Bagian dari Platform SIP</footer></div>;
}
