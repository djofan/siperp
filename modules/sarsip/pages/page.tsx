import Link from "next/link";
import { SarsipHero } from "@/modules/sarsip/components/Hero";
import { getProfile, listEntries, KINDS } from "@/modules/sarsip/api/data";
import { EntryCard } from "@/modules/sarsip/components/EntryCard";
import { Transparency } from "@/modules/sarsip/components/Transparency";
import { BeneficiariesSection } from "@/modules/sarsip/components/BeneficiariesSection";
export default async function SarsipHome() {
  const [profile, entries] = await Promise.all([getProfile(), listEntries()]);
  return <>
    <SarsipHero profile={profile} />
    <section id="tentang" className="scroll-mt-32 mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.6fr]"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Tentang tim</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Kepedulian yang<br/>bergerak bersama.</h2></div><p className="whitespace-pre-line text-base leading-8 text-slate-600">{profile.description}</p></section>
    <BeneficiariesSection/>
    {KINDS.map((kind, index) => {
      const items = entries.filter((e) => e.kind === kind).slice(0,3);
      return <section key={kind} className={index % 2 === 0 ? "border-y border-slate-200 bg-white" : ""}><div className="mx-auto max-w-6xl px-5 py-14 sm:px-8"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">{kind === "kegiatan" ? "Catatan lapangan" : kind === "berita" ? "Kabar dari tim" : "Ambil bagian"}</p><h2 className="mt-2 text-3xl font-bold tracking-tight">{kind === "kegiatan" ? "Kegiatan tim" : kind === "berita" ? "Berita terbaru" : "Campaign donasi"}</h2></div><Link href={`/sarsip/${kind}`} className="text-sm font-semibold text-orange-700">Lihat semua ↗</Link></div>{items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((entry) => <EntryCard key={entry.id} entry={entry}/>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">Belum ada {kind} yang dipublikasikan. Informasi terbaru akan tersedia di sini.</div>}</div></section>;
    })}
    <Transparency/>
  </>;
}
