import Link from "next/link";
import Navbar from "@/modules/sarsip/components/Navbar";
import { getProfile } from "@/modules/sarsip/api/data";
export default async function SarsipLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return <div className="min-h-screen bg-[#faf9f6] text-slate-900">
    <Navbar />
    <main className="pt-4">{children}</main>
    <footer className="bg-slate-950 text-white"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8"><div><p className="text-2xl font-black">SARSIP<span className="text-orange-500">.</span></p><p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">Tim SAR Solidaritas Insan Peduli. Bersama mendukung pencarian, pertolongan, dan aksi kemanusiaan.</p></div><div className="sm:text-right"><p className="text-sm font-semibold">Informasi & koordinasi</p><p className="mt-3 whitespace-pre-line text-sm text-slate-300">{profile.contact || "Informasi kontak tim akan diperbarui oleh pengelola."}</p><Link href="/" className="mt-5 inline-block text-sm text-orange-400">Tentang organisasi SIP ↗</Link></div></div><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Solidaritas Insan Peduli · SARSIP</div></footer>
  </div>;
}

