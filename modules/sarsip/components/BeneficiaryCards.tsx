"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BENEFICIARY_CATEGORIES } from "@/modules/sarsip/beneficiaryCategories";
type Row = { id: string; publicName: string | null; category: string; amount: number; image: string | null };
export function BeneficiaryCards({ rows, limit }: { rows: Row[]; limit?: number }) {
  const [category, setCategory] = useState("Semua");
  const filtered = rows.filter((row) => category === "Semua" || row.category === category);
  return <>
    <div aria-label="Filter kategori bantuan" className="my-8 flex flex-wrap gap-2">{["Semua", ...BENEFICIARY_CATEGORIES].map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-full border px-5 py-2.5 text-sm font-medium transition ${category === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-orange-500"}`}>{item}</button>)}</div>
    {filtered.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{filtered.slice(0, limit ?? filtered.length).map((row) => <article key={row.id} className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 p-5 text-white">
      {row.image ? <Image unoptimized fill src={row.image} alt={`Dokumentasi bantuan untuk ${row.publicName}`} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover"/> : <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-950 text-4xl font-black text-white/20">SARSIP</div>}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-slate-950/20"/>
      <span className="relative self-start rounded-full bg-slate-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">{row.category}</span>
      <div className="relative"><h3 className="break-words text-lg font-bold">{row.publicName}</h3><p className="mt-3 border-t border-white/20 pt-3 text-sm">Bantuan tersalurkan <span className="font-semibold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.amount)}</span></p></div>
    </article>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">Belum ada penerima manfaat yang dipublikasikan{category !== "Semua" ? ` untuk kategori ${category}` : ""}.</p>}
    {limit && <div className="mt-10 text-center"><Link href="/sarsip/penerima-manfaat" className="inline-flex rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold hover:border-orange-500">Lihat semua bantuan ↗</Link></div>}
  </>;
}
