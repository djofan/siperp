import Link from "next/link";
export function InfoPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <article className="pb-16 pt-28 sm:pb-24 sm:pt-32"><div className="mx-auto max-w-6xl px-4 sm:px-6">
    <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-sip-primary-900/50"><Link href="/" className="hover:text-sip-primary-700">Beranda</Link><span aria-hidden>/</span><span aria-current="page">{title}</span></nav>
    <header className="mb-10 max-w-3xl"><span className="inline-flex rounded-full bg-sip-primary-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-sip-primary-600">Solidaritas Insan Peduli</span><h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-sip-primary-900 sm:text-5xl">{title}</h1><p className="mt-5 text-lg leading-relaxed text-sip-primary-900/60">{description}</p></header>
    {children}
  </div></article>;
}
export function InfoLinks() {
  return <aside className="mt-12 rounded-3xl bg-sip-primary-900 p-7 text-white sm:p-9"><h2 className="text-2xl font-semibold">Kenali SIP lebih dekat</h2><div className="mt-5 flex flex-wrap gap-3">{[{href:"/tentang-kami",label:"Profil Yayasan"},{href:"/layanan",label:"Layanan & Program"},{href:"/pertanyaan-umum",label:"Pertanyaan Umum"},{href:"/kontak",label:"Hubungi Kami"}].map(l => <Link key={l.href} href={l.href} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white hover:text-sip-primary-900">{l.label} →</Link>)}</div></aside>;
}
