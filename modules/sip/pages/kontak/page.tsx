import Link from "next/link";
import { getMergedSiteContent } from "@/modules/sip/api/siteContent";
import { InfoPage, InfoLinks } from "@/modules/sip/components/InfoPage";
export default async function ContactPage() {
  const contact = await getMergedSiteContent("kontak");
  const phone = contact.phone.replace(/[^\d+]/g, "");
  const maps = /^https?:\/\//i.test(contact.mapsUrl) ? contact.mapsUrl : null;
  const items = [
    {label:"Alamat",value:contact.address,href:maps},
    {label:"Telepon",value:contact.phone,href:phone ? `tel:${phone}` : null},
    {label:"Email",value:contact.email,href:contact.email ? `mailto:${contact.email}` : null},
    {label:"Jam Layanan",value:contact.jamLayanan,href:null},
  ].filter(i => i.value.trim());
  return <InfoPage title="Hubungi Kami" description="Terhubung dengan Solidaritas Insan Peduli untuk informasi yayasan, program, dan kegiatan sosial.">
    {items.length > 0 ? <div className="grid gap-5 sm:grid-cols-2">{items.map(i => <section key={i.label} className="rounded-3xl bg-sip-primary-50/60 p-7"><h2 className="text-lg font-semibold text-sip-primary-900">{i.label}</h2><p className="mt-4 whitespace-pre-line leading-7 text-sip-primary-900/65">{i.value}</p>{i.href && <a href={i.href} className="mt-4 inline-block text-sm font-semibold text-sip-primary-600">{i.label === "Alamat" ? "Buka peta" : "Hubungi"} →</a>}</section>)}</div> : <p className="rounded-3xl bg-sip-primary-50/60 p-7 leading-7 text-sip-primary-900/65">Informasi kontak yayasan belum ditampilkan. Anda dapat membuka layanan yang sesuai untuk melihat informasi kontak program.</p>}
    <section className="mt-9"><h2 className="text-2xl font-semibold text-sip-primary-900">Pilih layanan yang sesuai</h2><div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-sip-primary-600"><Link href="/lazsip/kontak">Kontak LAZSIP →</Link><Link href="/sarsip">Informasi SARSIP →</Link><Link href="/academy">Informasi Insan Academy →</Link></div></section><InfoLinks current="/kontak" />
  </InfoPage>;
}
