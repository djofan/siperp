import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { splitLines } from "@/modules/sip/api/siteContent";

// Semua teks hero datang dari Konten Umum admin (sudah digabung default lewat getMergedSiteContent).

export function Hero({
  hero,
  stats,
}: {
  hero: Record<string, string>;
  stats: { value: string; label: string }[];
}) {
  const infaqHref = hero.infaqUrl || "/lazsip/donasi";
  const waNumber = process.env.NEXT_PUBLIC_SIP_WHATSAPP;
  const bantuanHref =
    hero.whatsappUrl ||
    (waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin mengajukan bantuan / bertanya seputar SIP.")}`
      : "/sip#program");
  const bantuanIsExternal = Boolean(hero.whatsappUrl || waNumber);
  const values = splitLines(hero.values);
  const showProfil = hero.profilVisible !== "false" && stats.length > 0;

  return (
    <section id="beranda" className="bg-white pb-6 pt-24 sm:pb-10 sm:pt-28">
      <div data-reveal className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sip-primary-50 px-3.5 py-1.5 text-xs font-semibold text-sip-primary-700">
            <span className="h-1.5 w-1.5 rounded-full bg-sip-primary-500" />
            {hero.badge}
          </span>

          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-sip-primary-900 sm:text-5xl lg:text-[3.5rem]">
            {hero.title}
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-sip-primary-900/60 sm:text-lg">
            {hero.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={infaqHref}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-sip-primary-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
            >
              {hero.infaqLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href={bantuanHref}
              target={bantuanIsExternal ? "_blank" : undefined}
              rel={bantuanIsExternal ? "noopener noreferrer" : undefined}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sip-primary-50 px-6 py-3.5 text-sm font-semibold text-sip-primary-900 transition-colors hover:bg-sip-primary-100"
            >
              {hero.bantuanLabel}
            </a>
          </div>

          {values.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
            {values.map((value) => (
              <li key={value} className="flex items-center gap-2 text-sm font-medium text-sip-primary-900/60">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 text-sip-primary-500" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {value}
              </li>
            ))}
          </ul>
          )}
        </div>

        <div>
          <ImagePlaceholder
            variant="person"
            src={hero.backgroundImage}
            alt=""
            className="aspect-[4/3] w-full rounded-[2rem] lg:aspect-[1/1]"
          />

        </div>
      </div>

      {showProfil && (
        <div data-reveal className="mx-auto mt-10 max-w-6xl px-4 sm:mt-12 sm:px-6">
          <div className="flex flex-col gap-8 rounded-[2rem] bg-sip-primary-50/70 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-8">
            <div className="max-w-md">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sip-primary-600">
                <span className="h-1.5 w-1.5 rounded-full bg-sip-primary-500" />
                {hero.profilEyebrow}
              </span>
              <p className="mt-3 text-xl font-semibold leading-snug tracking-tight text-sip-primary-900 sm:text-2xl">
                {hero.profilTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-sip-primary-900/55">
                {hero.profilBody}
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-12 gap-y-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-4xl font-bold tracking-tight text-sip-primary-900 sm:text-5xl">{stat.value}</dt>
                  <dd className="mt-1 text-sm text-sip-primary-900/55">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
