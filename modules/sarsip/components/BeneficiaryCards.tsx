"use client";

import styles from "./Landing.module.css";

import Image from "next/image";
import { SarsipDetailLink as Link } from "./DetailNavigation";

type Row = { id: string; publicName: string | null; category: string; amount: number; image: string | null; isPreview?: boolean };
export function BeneficiaryCards({ rows, limit }: { rows: Row[]; limit?: number }) {
  return <>
    {rows.length ? <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{rows.slice(0, limit ?? rows.length).map((row) => <article key={row.id} className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 p-5 text-white">
      {row.image ? <Image unoptimized fill src={row.image} alt={row.isPreview ? "Foto ilustrasi bantuan kemanusiaan" : `Dokumentasi bantuan untuk ${row.publicName}`} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover"/> : <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-950 text-4xl font-black text-white/20">SARSIP</div>}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-slate-950/20"/>
      {row.isPreview && <span className={styles.previewBadge}>Contoh desain</span>}
      <span className="relative self-start rounded-full bg-slate-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">{row.category}</span>
      {<Link href={`/sarsip/penerima-manfaat/${row.id}`} className="absolute inset-0 z-10" aria-label={`${row.isPreview ? "Lihat contoh bantuan" : "Lihat bantuan"}: ${row.publicName}`}/>}
      <div className="relative"><h3 className="break-words text-lg font-bold">{row.publicName}</h3><p className="mt-3 border-t border-white/20 pt-3 text-sm">Bantuan tersalurkan <span className="font-semibold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.amount)}</span></p></div>
    </article>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">Belum ada penerima manfaat yang dipublikasikan.</p>}
    {limit && <div className="mt-10 text-center"><Link href="/sarsip/penerima-manfaat" className="inline-flex rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold hover:border-orange-500">Lihat semua bantuan ↗</Link></div>}
  </>;
}
