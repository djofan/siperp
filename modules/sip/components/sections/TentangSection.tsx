import { splitLines } from "@/modules/sip/api/siteContent";
import { SectionHeading, AccentTitle } from "@/modules/sip/components/ui/SectionHeading";

export function TentangSection({ content }: { content: Record<string, string> }) {
  const misiItems = splitLines(content.misi);
  const legalitasItems = splitLines(content.legalitas);

  return (
    <section id="tentang" className="bg-white py-14 sm:py-20">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={content.eyebrow} title={<AccentTitle text={content.title} />} description={content.body} />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2">
          <div className="rounded-3xl bg-sip-primary-50/60 p-6 sm:p-7">
            <h3 className="flex items-center gap-3 text-base font-semibold text-sip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 rounded-full bg-white p-1.5 text-sip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
              </svg>
              Visi
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-sip-primary-900/60">{content.visi}</p>
          </div>

          <div className="rounded-3xl bg-sip-primary-50/60 p-6 sm:p-7">
            <h3 className="flex items-center gap-3 text-base font-semibold text-sip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 rounded-full bg-white p-1.5 text-sip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Misi
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm leading-relaxed text-sip-primary-900/60">
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
          <div className="mt-5 rounded-3xl bg-sip-primary-50/60 p-6 sm:p-7">
            <h3 className="text-base font-semibold text-sip-primary-900">Legalitas</h3>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-sip-primary-900/60 sm:grid sm:grid-cols-2 sm:gap-x-8">
              {legalitasItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-sip-primary-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
