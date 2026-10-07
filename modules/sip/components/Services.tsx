import Link from "next/link";
export const serviceDefinitions = [
  { slug: "lazsip", key: "lazsip", caption: "Zakat & Kepedulian Sosial", href: "/lazsip", links: [{href:"/lazsip/zakat",label:"Tunaikan zakat"},{href:"/lazsip/donasi",label:"Program donasi"},{href:"/lazsip/transparansi",label:"Transparansi dana"}] },
  { slug: "sarsip", key: "sarsip", caption: "Pencarian & Aksi Kemanusiaan", href: "/sarsip", links: [{href:"/sarsip/kegiatan",label:"Kegiatan SARSIP"},{href:"/sarsip/campaign",label:"Dukung campaign"},{href:"/sarsip/berita",label:"Berita tim"}] },
  { slug: "insan-academy", key: "academy", caption: "Pembelajaran & Pendidikan", href: "/academy", links: [{href:"/academy/program",label:"Lihat program belajar"},{href:"/academy/daftar",label:"Pendaftaran peserta"},{href:"/academy/masuk",label:"Masuk peserta"}] },
] as const;
export function ServiceCards({ content }: { content: Record<string,string> }) {
  return <div className="grid gap-5 md:grid-cols-3">{serviceDefinitions.map((s,i) => <Link key={s.slug} href={`/layanan/${s.slug}`} className="group flex flex-col rounded-3xl border border-sip-primary-100 bg-white p-7 transition-colors hover:bg-sip-primary-50/60"><span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sip-primary-50 text-lg font-bold text-sip-primary-600">0{i+1}</span><p className="text-xs font-semibold uppercase tracking-wider text-sip-primary-500">{s.caption}</p><h2 className="mt-3 text-2xl font-semibold text-sip-primary-900">{content[s.key+"Title"]}</h2><p className="mt-4 flex-1 text-sm leading-7 text-sip-primary-900/60">{content[s.key+"Description"]}</p><span className="mt-7 text-sm font-semibold text-sip-primary-600">Kenali lebih lanjut →</span></Link>)}</div>;
}
