import Link from "next/link";
import { getSiteContent } from "@/modules/sip/api/siteContent";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";

const DEFAULT_VISI =
  "Mengentaskan permasalahan sosial kaum muslimin secara cepat dan tepat.";

const DEFAULT_MISI = [
  "Menghimpun dan menyalurkan dana infaq, sedekah, dan zakat secara amanah.",
  "Membangun individu yang tanggap dan peduli terhadap sesama.",
  "Mengelola bantuan secara transparan dan akuntabel berdasarkan verifikasi lapangan.",
];

export default async function TentangPage() {
  const tentang = await getSiteContent("tentang");

  const misiItems = tentang?.misi
    ? tentang.misi.split("\n").map((line) => line.trim()).filter(Boolean)
    : DEFAULT_MISI;

  const legalitasItems = tentang?.legalitas
    ? tentang.legalitas.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Profil" title="Tentang Solidaritas Insan Peduli" />

      <div className="mt-8 rounded-3xl border border-sip-primary-100 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-bold text-sip-primary-900">Sejarah</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sip-primary-800/70">
          {tentang?.body ||
            "Solidaritas Insan Peduli (SIP) adalah yayasan sosial, kemanusiaan, dan keagamaan yang berdiri di Cileungsi, Bogor. SIP menyalurkan bantuan darurat berupa infaq, sedekah, dan zakat kepada masyarakat yang membutuhkan berdasarkan verifikasi lapangan oleh tim relawan."}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-3xl border border-sip-primary-100 bg-white p-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-sip-primary-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-sip-primary-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
            </svg>
            Visi
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-sip-primary-800/70">{tentang?.visi || DEFAULT_VISI}</p>
        </div>

        <div className="rounded-3xl border border-sip-primary-100 bg-white p-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-sip-primary-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-sip-primary-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Misi
          </h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-sip-primary-800/70">
            {misiItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sip-primary-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-sip-primary-100 bg-white p-6">
        <h3 className="text-base font-bold text-sip-primary-900">Legalitas</h3>
        {legalitasItems.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-sip-primary-800/70">
            {legalitasItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-sip-secondary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-sip-primary-800/60">
            Informasi legalitas lengkap sedang diperbarui admin.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/sip/jangkauan-bantuan"
          className="inline-flex items-center gap-2 rounded-full border border-sip-primary-900/20 bg-white px-6 py-3 text-sm font-semibold text-sip-primary-900 transition-colors hover:border-sip-primary-900/40"
        >
          Jangkauan Bantuan →
        </Link>
      </div>
    </div>
  );
}
