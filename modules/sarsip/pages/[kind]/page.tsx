import { notFound } from "next/navigation";
import { isEntryKind, listEntries } from "@/modules/sarsip/api/data";
import { EntryCard } from "@/modules/sarsip/components/EntryCard";
import { ContentBackdrop } from "@/modules/sarsip/components/ContentBackdrop";
const descriptions = { berita: "Kabar terbaru, informasi, dan cerita dari tim SARSIP.", kegiatan: "Cerita dan dokumentasi aksi tim di lapangan.", campaign: "Pilih misi kemanusiaan yang ingin Anda dukung." };
export default async function EntriesPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isEntryKind(kind)) notFound();
  const entries = await listEntries(kind);
  return <ContentBackdrop><div className="mx-auto max-w-7xl px-4 py-12 sm:px-8"><div className="rounded-3xl border border-white/60 bg-[#faf9f6] p-5 shadow-xl sm:p-10"><p className="text-xs font-bold uppercase tracking-widest text-orange-700">SARSIP / {kind}</p><h1 className="mt-3 text-4xl font-black capitalize tracking-tight">{kind === "campaign" ? "Campaign donasi" : kind}</h1><p className="mt-4 max-w-xl text-slate-600">{descriptions[kind]}</p>{entries.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{entries.map((entry) => <EntryCard key={entry.id} entry={entry}/>)}</div> : <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-slate-500">Belum ada {kind} yang dipublikasikan.</p>}</div></div></ContentBackdrop>;
}

