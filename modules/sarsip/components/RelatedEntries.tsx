import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KINDS, type EntryKind } from "@/modules/sarsip/api/data";

const labels = { kegiatan: "Kegiatan lain", berita: "Berita lain", campaign: "Campaign lain" };

export async function RelatedEntries({ currentId, kind }: { currentId: string; kind: EntryKind }) {
  const kinds = [kind, ...KINDS.filter((item) => item !== kind)];
  const groups = await Promise.all(kinds.map(async (category) => ({
    category,
    entries: await prisma.sarsipEntry.findMany({
      where: { kind: category, id: { not: currentId }, status: { in: ["published", "completed"] } },
      select: { id: true, title: true, image: true, description: true },
      orderBy: { createdAt: "desc" }, take: 3,
    }),
  })));
  return <div className="space-y-6" aria-label="Konten SARSIP lainnya">
    {groups.map(({ category, entries }) => <section key={category} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{labels[category]}</h2>
        <Link href={`/sarsip/${category}`} className="text-xs font-semibold text-orange-700 hover:underline">Lihat semua ↗</Link>
      </div>
      {entries.length ? <ul className="divide-y divide-slate-100">{entries.map((entry) => <li key={entry.id}>
        <Link href={`/sarsip/${category}/${entry.id}`} className="group flex items-start gap-3 py-4 first:pt-0">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
            {entry.image ? <Image unoptimized fill sizes="80px" src={entry.image} alt="" className="object-cover"/> : <span className="flex h-full items-center justify-center text-xs font-bold text-orange-400">SARSIP</span>}
          </div>
          <div className="min-w-0"><h3 className="line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900 group-hover:text-orange-700">{entry.title}</h3><p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500">{entry.description}</p></div>
        </Link>
      </li>)}</ul> : <p className="text-sm leading-6 text-slate-500">Belum ada {category} lain yang dipublikasikan.</p>}
    </section>)}
  </div>;
}
