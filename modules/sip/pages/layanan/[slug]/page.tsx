import Link from "next/link";
import { notFound } from "next/navigation";
import { getMergedSiteContent, splitLines } from "@/modules/sip/api/siteContent";
import { InfoPage, InfoLinks } from "@/modules/sip/components/InfoPage";
import { serviceDefinitions } from "@/modules/sip/components/Services";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const {slug} = await params, service = serviceDefinitions.find(s => s.slug === slug);
  if (!service) notFound();
  const content = await getMergedSiteContent("layanan");
  return { title: `${content[service.key+"Title"]} | Solidaritas Insan Peduli`, description: content[service.key+"Description"] };
}
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const {slug} = await params, service = serviceDefinitions.find(s => s.slug === slug);
  if (!service) notFound();
  const content = await getMergedSiteContent("layanan");
  return <InfoPage title={content[service.key+"Title"]} description={content[service.key+"Description"]}>
    <div className="grid gap-7 lg:grid-cols-[1.5fr_1fr]"><section className="rounded-3xl bg-sip-primary-50/60 p-7 sm:p-9"><p className="text-sm font-semibold uppercase tracking-wider text-sip-primary-500">{service.caption}</p><h2 className="mt-4 text-2xl font-semibold text-sip-primary-900">Apa yang dapat Anda lakukan?</h2><ul className="mt-6 space-y-4 text-sip-primary-900/70">{splitLines(content[service.key+"Activities"]).map((item,i) => <li key={i} className="flex gap-3"><span className="font-semibold text-sip-primary-500">{i+1}.</span><span>{item}</span></li>)}</ul></section><aside className="rounded-3xl border border-sip-primary-100 p-7"><h2 className="text-xl font-semibold text-sip-primary-900">Jelajahi layanan</h2><div className="mt-5 space-y-4">{service.links.map(l => <Link key={l.href} href={l.href} className="block text-sm font-semibold text-sip-primary-600 hover:underline">{l.label} →</Link>)}</div><Link href={service.href} className="mt-8 inline-flex rounded-full bg-sip-primary-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sip-primary-700">Kunjungi {content[service.key+"Title"]} ↗</Link></aside></div><InfoLinks />
  </InfoPage>;
}
