import Link from "next/link";
import { getMergedSiteContent, splitLines } from "@/modules/sip/api/siteContent";
import { InfoPage, InfoLinks } from "@/modules/sip/components/InfoPage";

const EXPLORE_LINKS = [
  { href: "/program-bantuan", title: "Program Bantuan", description: "Program yang sedang berjalan dan cara mendukungnya." },
  { href: "/penyaluran-bantuan", title: "Penyaluran Bantuan", description: "Dokumentasi bantuan yang sudah disalurkan." },
  { href: "/laporan", title: "Laporan Yayasan", description: "Laporan bulanan dan tahunan yayasan." },
];

export default async function AboutPage() {
  const content = await getMergedSiteContent("tentang");
  const misi = splitLines(content.misi);
  const legal = splitLines(content.legalitas);

  return (
    <InfoPage title="Tentang SIP" description="Profil, visi dan misi, serta legalitas Yayasan Solidaritas Insan Peduli.">
      <section className="rounded-3xl bg-sip-primary-50/60 p-7 sm:p-9">
        <h2 className="text-2xl font-semibold text-sip-primary-900">Siapa kami</h2>
        <p className="mt-4 max-w-4xl whitespace-pre-line text-base leading-8 text-sip-primary-900/70">{content.body}</p>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-sip-primary-100 p-7">
          <h2 className="text-xl font-semibold text-sip-primary-900">Visi</h2>
          <p className="mt-4 leading-7 text-sip-primary-900/65">{content.visi}</p>
        </section>
        <section className="rounded-3xl border border-sip-primary-100 p-7">
          <h2 className="text-xl font-semibold text-sip-primary-900">Misi</h2>
          <ol className="mt-4 space-y-3 text-sip-primary-900/65">
            {misi.map((item, i) => (
              <li key={i} className="flex gap-3 leading-7">
                <span className="w-4 shrink-0 font-semibold text-sip-primary-500">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {legal.length > 0 && (
        <section className="mt-5 rounded-3xl border border-sip-primary-100 p-7">
          <h2 className="text-xl font-semibold text-sip-primary-900">Legalitas Yayasan</h2>
          <ul className="mt-4 space-y-3 text-sip-primary-900/65">
            {legal.map((item, i) => (
              <li key={i} className="flex gap-3 leading-7">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-1.5 h-4 w-4 shrink-0 text-sip-primary-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-sip-primary-900">Lihat kegiatan yayasan</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col rounded-3xl border border-sip-primary-100 p-6 transition-colors hover:bg-sip-primary-50/60"
            >
              <span className="font-semibold text-sip-primary-900">{link.title}</span>
              <span className="mt-2 flex-1 text-sm leading-6 text-sip-primary-900/60">{link.description}</span>
              <span className="mt-4 text-sm font-semibold text-sip-primary-600">Buka →</span>
            </Link>
          ))}
        </div>
      </section>

      <InfoLinks current="/tentang-kami" />
    </InfoPage>
  );
}
