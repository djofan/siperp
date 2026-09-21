import Link from "next/link";
import { getProfile } from "@/modules/sarsip/api/data";
export default async function SarsipLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return <div className="min-h-screen bg-[#faf9f6] text-slate-900">
    <header className="sticky top-3 z-40 mx-auto max-w-6xl px-3 pt-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white/95 px-5 py-3 shadow-lg backdrop-blur-md lg:rounded-full lg:px-6">
        <Link href="/sarsip" className="flex items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-xl font-black text-white">S</span><span className="text-xl font-black tracking-tight">SAR<span className="text-orange-600">SIP</span><span className="block text-[9px] font-semibold tracking-[.15em] text-slate-500">SEARCH & RESCUE</span></span></Link>
        <nav aria-label="Navigasi SARSIP" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium"><Link href="/sarsip#tentang" className="hover:text-orange-700">Tentang</Link><Link href="/sarsip/kegiatan" className="hover:text-orange-700">Kegiatan</Link><Link href="/sarsip/berita" className="hover:text-orange-700">Berita</Link><Link href="/sarsip/campaign" className="hover:text-orange-700">Campaign</Link><Link href="/sarsip#transparansi" className="hover:text-orange-700">Transparansi</Link><Link href="/sarsip/campaign" className="rounded-full bg-orange-600 px-5 py-2.5 font-bold text-white hover:bg-orange-700">Donasi</Link></nav>
      </div>
    </header>
    <main className="pt-4">{children}</main>
    <footer className="bg-slate-950 text-white"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8"><div><p className="text-2xl font-black">SARSIP<span className="text-orange-500">.</span></p><p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">Tim SAR Solidaritas Insan Peduli. Bersama mendukung pencarian, pertolongan, dan aksi kemanusiaan.</p></div><div className="sm:text-right"><p className="text-sm font-semibold">Informasi & koordinasi</p><p className="mt-3 whitespace-pre-line text-sm text-slate-300">{profile.contact || "Informasi kontak tim akan diperbarui oleh pengelola."}</p><Link href="/sip" className="mt-5 inline-block text-sm text-orange-400">Tentang organisasi SIP ↗</Link></div></div><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Solidaritas Insan Peduli · SARSIP</div></footer>
  </div>;
}

