import { paymentGateway, sandboxMethod } from "@/modules/payment/api/midtrans";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEntry, isEntryKind, listPublicDonations, money } from "@/modules/sarsip/api/data";
import { DonationForm } from "@/modules/sarsip/components/DonationForm";
import { RelatedEntries } from "@/modules/sarsip/components/RelatedEntries";
import { ContentBackdrop } from "@/modules/sarsip/components/ContentBackdrop";
export default async function DetailPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isEntryKind(kind)) notFound();
  const entry = await getEntry(id, kind);
  if (!entry) notFound();
  const isCampaign = kind === "campaign";
  const donors = isCampaign ? await listPublicDonations(id) : [];
  const methods = isCampaign ? (paymentGateway() === "midtrans_sandbox" ? [sandboxMethod] : await prisma.sarsipPaymentMethod.findMany({ orderBy: { method: "asc" } })) : [];
  return <ContentBackdrop><div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14"><Link href={`/sarsip/${kind}`} className="inline-flex rounded-full border border-white/20 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-orange-200 hover:bg-slate-950/70">← Semua {kind}</Link><div className={`mt-8 grid items-start gap-6 lg:gap-8 ${isCampaign ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}`}>
    <article className="min-w-0 break-words rounded-3xl border border-white/60 bg-[#faf9f6] p-5 shadow-xl sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-orange-700">{kind} · {entry.status === "completed" ? "Selesai" : "SARSIP"}</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{entry.title}</h1><div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">{entry.location && <span>{entry.location}</span>}{entry.eventDate && <time dateTime={entry.eventDate.toISOString()}>{entry.eventDate.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })}</time>}</div>
      {entry.image && <div className="relative mt-8 aspect-video overflow-hidden rounded-2xl"><Image unoptimized fill sizes="(max-width: 1024px) 100vw, 60vw" src={entry.image} alt={entry.title} className="object-cover"/></div>}
      {isCampaign && <div className="mt-8 rounded-2xl border border-orange-100 bg-orange-50 p-5"><p className="text-2xl font-bold text-orange-800">{money(entry.currentAmount)}</p><p className="mt-1 text-sm text-slate-600">terkumpul dari target {money(entry.targetAmount)}</p><div role="progressbar" aria-label="Pencapaian target donasi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(entry.currentAmount / entry.targetAmount * 100))} className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full bg-orange-500" style={{ width: `${Math.min(100, entry.currentAmount / entry.targetAmount * 100)}%` }}/></div><p className="mt-3 text-xs text-slate-500">Total dari donasi terkonfirmasi, tanpa biaya admin.</p></div>}
      <p className="mt-8 whitespace-pre-line leading-8 text-slate-600">{entry.description}</p>
      {isCampaign && <section className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-bold">Donatur</h2>{donors.length ? <ul className="mt-4 divide-y divide-slate-200">{donors.map((d) => <li key={d.id} className="flex justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-words">{d.name}</span><span className="shrink-0 font-semibold">{money(d.amount)}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Belum ada donasi yang terkonfirmasi.</p>}</section>}
    </article>
    <aside aria-label="Sidebar SARSIP" tabIndex={0} className="min-w-0 space-y-6 rounded-3xl bg-slate-950/25 p-3 ring-1 ring-white/15 lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-orange-400">{isCampaign && (entry.status === "published" ? <DonationForm campaignId={id} methods={methods}/> : <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Campaign selesai</h2><p className="mt-2 text-sm text-slate-500">Terima kasih atas dukungan Anda. Donasi untuk campaign ini sudah ditutup.</p><Link href="/sarsip/campaign" className="mt-4 inline-block text-sm font-semibold text-orange-700">Lihat campaign lainnya ↗</Link></div>)}<RelatedEntries currentId={id} kind={kind}/></aside>
  </div></div></ContentBackdrop>;
}
