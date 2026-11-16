import styles from "@/modules/sarsip/components/Landing.module.css";
import { OrganizationContact } from "@/components/OrganizationContact";
import Link from "next/link";
import Navbar from "@/modules/sarsip/components/Navbar";
import { getProfile } from "@/modules/sarsip/api/data";
import { SarsipMark } from "@/modules/sarsip/components/SarsipMark";
export default async function SarsipLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return <div data-sarsip-site className={`min-h-screen ${styles.site}`}>
    <Navbar />
    <main>{children}</main>
    <footer className={styles.footer}><div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8"><div><div className="flex items-center gap-4"><SarsipMark className="h-20 w-20" /><p className="text-2xl font-black">SARSIP<span className="text-orange-500">.</span></p></div><p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">Tim SAR Solidaritas Insan Peduli. Bersama mendukung pencarian, pertolongan, dan aksi kemanusiaan.</p></div><div className="sm:text-right"><p className="text-sm font-semibold">Informasi & koordinasi</p><p className="mt-3 whitespace-pre-line text-sm text-slate-300">{profile.contact || "Informasi kontak tim akan diperbarui oleh pengelola."}</p><Link href="/" className="mt-5 inline-block text-sm text-orange-400">Tentang organisasi SIP ↗</Link></div></div><nav aria-label="Navigasi footer SARSIP" className={styles.footerNav}>{[["Tentang tim", "/sarsip#tentang"], ["Campaign", "/sarsip#campaign"], ["Kegiatan", "/sarsip/kegiatan"], ["Berita", "/sarsip/berita"], ["Penerima manfaat", "/sarsip/penerima-manfaat"], ["Transparansi", "/sarsip#transparansi"]].map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><OrganizationContact/><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Solidaritas Insan Peduli · SARSIP</div></footer>
  </div>;
}

