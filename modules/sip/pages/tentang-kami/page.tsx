import Link from "next/link";
import { getMergedSiteContent, splitLines } from "@/modules/sip/api/siteContent";
import { InfoPage, InfoLinks } from "@/modules/sip/components/InfoPage";
export default async function AboutPage() {
  const content = await getMergedSiteContent("tentang"), legal = splitLines(content.legalitas);
  return <InfoPage title="Tentang SIP" description={content.title}>
    <div className="rounded-3xl bg-sip-primary-50/60 p-7 sm:p-9"><h2 className="text-2xl font-semibold text-sip-primary-900">Siapa kami</h2><p className="mt-4 whitespace-pre-line text-base leading-8 text-sip-primary-900/70">{content.body}</p></div>
    <div className="mt-5 grid gap-5 md:grid-cols-2"><section className="rounded-3xl border border-sip-primary-100 p-7"><h2 className="text-xl font-semibold text-sip-primary-900">Visi</h2><p className="mt-4 leading-7 text-sip-primary-900/65">{content.visi}</p></section><section className="rounded-3xl border border-sip-primary-100 p-7"><h2 className="text-xl font-semibold text-sip-primary-900">Misi</h2><ul className="mt-4 space-y-3 text-sip-primary-900/65">{splitLines(content.misi).map((item,i) => <li key={i} className="flex gap-3"><span className="font-semibold text-sip-primary-500">{i+1}.</span><span>{item}</span></li>)}</ul></section></div>
    {legal.length > 0 && <section className="mt-5 rounded-3xl border border-sip-primary-100 p-7"><h2 className="text-xl font-semibold text-sip-primary-900">Legalitas Yayasan</h2><ul className="mt-4 space-y-3 text-sip-primary-900/65">{legal.map((item,i) => <li key={i}>{item}</li>)}</ul></section>}
    <section className="mt-10"><h2 className="text-2xl font-semibold text-sip-primary-900">Kepedulian yang dapat Anda ikuti</h2><p className="mt-3 leading-7 text-sip-primary-900/60">Kenali program bantuan, dukungan kemanusiaan, dan kegiatan pembelajaran. Dokumentasi penyaluran dan laporan tersedia untuk melihat kegiatan yayasan.</p><div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-sip-primary-600"><Link href="/program-bantuan">Lihat program bantuan →</Link><Link href="/penyaluran-bantuan">Dokumentasi penyaluran →</Link><Link href="/laporan">Laporan yayasan →</Link></div></section><InfoLinks />
  </InfoPage>;
}
