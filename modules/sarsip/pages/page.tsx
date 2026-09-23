import Link from "next/link";
import { getProfile, listEntries, KINDS } from "@/modules/sarsip/api/data";
import { EntryCard } from "@/modules/sarsip/components/EntryCard";
import { Transparency } from "@/modules/sarsip/components/Transparency";
import { BeneficiariesSection } from "@/modules/sarsip/components/BeneficiariesSection";
export default async function SarsipHome() {
  const [profile, entries] = await Promise.all([getProfile(), listEntries()]);
  return <>
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.3fr_1fr]">
        <div><p className="text-xs font-bold uppercase tracking-[.25em] text-orange-400">Solidaritas dalam aksi</p><h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.1] tracking-tight sm:text-6xl">{profile.headline}</h1><p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300">Setiap dukungan berarti bagi upaya pencarian, pertolongan, dan pemulihan. Kenali tim kami dan ambil bagian dalam misi kemanusiaan.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/sarsip/campaign" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-orange-400">Dukung campaign ↗</Link><Link href="/sarsip/kegiatan" className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold hover:bg-white/10">Lihat kegiatan tim</Link></div></div>
        <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,#194438_0%,#0f172a_65%)]" aria-hidden="true"><div className="absolute inset-8 rounded-full border border-dashed border-orange-400/40"/><div className="absolute inset-16 rounded-full border border-white/15"/><div className="relative text-center"><p className="text-xs font-bold tracking-[.3em] text-orange-400">SEARCH & RESCUE</p><p className="my-4 text-6xl font-black tracking-tighter">SAR<span className="text-orange-500">SIP</span></p><p className="text-[10px] tracking-[.25em] text-slate-400">KEPEDULIAN · KESIAPSIAGAAN</p></div><span className="absolute right-9 top-14 h-4 w-4 rounded-full bg-orange-500 ring-8 ring-orange-500/10"/></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-5 text-xs font-bold uppercase tracking-[.15em] text-slate-400 sm:px-8"><span>Pencarian & pertolongan</span><span>Respons bencana</span><span>Kesiapsiagaan masyarakat</span></div></div>
    </section>
    <section id="tentang" className="scroll-mt-32 mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.6fr]"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Tentang tim</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Kepedulian yang<br/>bergerak bersama.</h2></div><p className="whitespace-pre-line text-base leading-8 text-slate-600">{profile.description}</p></section>
    <BeneficiariesSection/>
    {KINDS.map((kind, index) => {
      const items = entries.filter((e) => e.kind === kind).slice(0,3);
      return <section key={kind} className={index % 2 === 0 ? "border-y border-slate-200 bg-white" : ""}><div className="mx-auto max-w-6xl px-5 py-14 sm:px-8"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">{kind === "kegiatan" ? "Catatan lapangan" : kind === "berita" ? "Kabar dari tim" : "Ambil bagian"}</p><h2 className="mt-2 text-3xl font-bold tracking-tight">{kind === "kegiatan" ? "Kegiatan tim" : kind === "berita" ? "Berita terbaru" : "Campaign donasi"}</h2></div><Link href={`/sarsip/${kind}`} className="text-sm font-semibold text-orange-700">Lihat semua ↗</Link></div>{items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((entry) => <EntryCard key={entry.id} entry={entry}/>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">Belum ada {kind} yang dipublikasikan. Informasi terbaru akan tersedia di sini.</div>}</div></section>;
    })}
    <Transparency/>
  </>;
}

