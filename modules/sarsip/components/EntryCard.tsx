import Link from "next/link";
import Image from "next/image";
import { money } from "@/modules/sarsip/api/data";
type Entry = { id: string; kind: string; title: string; description: string; image: string | null; location: string | null; targetAmount: number; currentAmount: number; status: string };
export function EntryCard({ entry }: { entry: Entry }) {
  const progress = Math.min(100, Math.max(0, entry.targetAmount ? entry.currentAmount / entry.targetAmount * 100 : 0));
  return <Link href={`/sarsip/${entry.kind}/${entry.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-slate-900">
      {entry.image ? <Image unoptimized fill sizes="(max-width: 768px) 100vw, 33vw" src={entry.image} alt={entry.title} className="object-cover transition duration-500 group-hover:scale-105"/> :
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-orange-500/40 text-4xl font-black text-orange-400" aria-hidden="true">S<span className="text-white">/</span>R</div>}
      <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800">{entry.kind === "campaign" ? "Galang dukungan" : entry.kind}</span>
    </div>
    <div className="p-5">
      {entry.location && <p className="mb-2 text-xs font-medium text-orange-700">{entry.location}</p>}
      <h3 className="text-lg font-bold leading-snug text-slate-900 group-hover:text-orange-700">{entry.title}</h3>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{entry.description}</p>
      {entry.kind === "campaign" ? <div className="mt-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{width: `${progress}%`}}/></div>
        <p className="mt-2 text-sm font-bold text-slate-900">{money(entry.currentAmount)} <span className="font-normal text-slate-500">terkumpul</span></p>
        <p className="mt-1 text-xs text-slate-500">Target {money(entry.targetAmount)} · {entry.status === "completed" ? "Selesai" : "Terbuka"}</p>
      </div> : <p className="mt-5 text-sm font-semibold text-orange-700">Baca selengkapnya <span aria-hidden="true">↗</span></p>}
    </div>
  </Link>;
}

