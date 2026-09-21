import { getSiteContent } from "@/modules/sip/api/siteContent";
import { SIP_SITE_CONTENT_DEFAULTS } from "@/modules/sip/api/siteContentDefaults";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";

export async function TentangSection() {
  const tentang = await getSiteContent("tentang");
  const defaults = SIP_SITE_CONTENT_DEFAULTS.tentang;

  const misiItems = (tentang?.misi || defaults.misi)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const legalitasItems = (tentang?.legalitas || defaults.legalitas)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section id="tentang" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="Profil"
        title="Tentang Solidaritas Insan Peduli"
        description={tentang?.body || defaults.body}
      />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] sm:p-7">
          <h3 className="flex items-center gap-2 text-base font-bold text-sip-primary-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-sip-primary-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
            </svg>
            Visi
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-sip-primary-800/70">{tentang?.visi || defaults.visi}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] sm:p-7">
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

      {legalitasItems.length > 0 && (
        <div className="mt-5 rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] sm:p-7">
          <h3 className="text-base font-bold text-sip-primary-900">Legalitas</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-sip-primary-800/70 sm:grid sm:grid-cols-2">
            {legalitasItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-sip-secondary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
