interface HeroContent {
  backgroundImage?: string;
  title?: string;
  subtitle?: string;
  whatsappUrl?: string;
  infaqUrl?: string;
}

export function Hero({
  hero,
  stats,
}: {
  hero: HeroContent;
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
  const title = hero.title || "Bahagia dengan Membahagiakan Orang Lain";
  const words = title.split(" ");
  const accentWord = words.length > 1 ? words[1] : null;

  return (
    <section id="beranda" className="relative overflow-hidden bg-sip-cream pb-16 pt-32 sm:pb-24 sm:pt-40">
      {/* Aksen dekoratif minimalis — bukan foto full-bleed kayak LAZSIP, cuma lingkaran
          blur tipis di pojok supaya kanvas tetap terang dan lapang. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sip-primary-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sip-accent/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sip-primary-700">
            <span className="h-1.5 w-1.5 rounded-full bg-sip-primary-500" />
            Ikhlas — Murni Sosial
          </span>

          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-sip-ink sm:text-5xl lg:text-[3.25rem]">
            {accentWord ? (
              <>
                {words[0]} <span className="text-sip-primary-500">{accentWord}</span> {words.slice(2).join(" ")}
              </>
            ) : (
              title
            )}
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-sip-primary-800/70 sm:text-lg">
            {hero.subtitle ||
              "Solidaritas Insan Peduli menyalurkan bantuan dana infaq, sedekah, dan zakat kepada mereka yang membutuhkan secara cepat dan tepat sasaran."}
          </p>

          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <a
              href={infaqHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sip-primary-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
            >
              Infaq Sekarang
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href={bantuanHref}
              target={bantuanIsExternal ? "_blank" : undefined}
              rel={bantuanIsExternal ? "noopener noreferrer" : undefined}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sip-primary-900/15 px-6 py-3 text-sm font-semibold text-sip-primary-900 transition-colors hover:bg-sip-primary-900/5"
            >
              Pengajuan Bantuan
            </a>
          </div>

          {stats.length > 0 && (
            <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-sip-primary-900/10 pt-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xl font-extrabold text-sip-primary-900 sm:text-3xl">{stat.value}</dt>
                  <dd className="text-xs text-sip-primary-800/60">{stat.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          {hero.backgroundImage ? (
            <div className="aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_20px_60px_-20px_rgba(33,53,4,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto hero dari admin, bukan asset Next dioptimasi */}
              <img src={hero.backgroundImage} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-sip-primary-100 via-sip-primary-50 to-white shadow-[0_20px_60px_-20px_rgba(33,53,4,0.2)]">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: "radial-gradient(var(--color-sip-primary-200) 1.5px, transparent 1.5px)",
                  backgroundSize: "22px 22px",
                }}
                aria-hidden
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-sip-primary-200/60 sm:h-28 sm:w-28">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-sip-primary-500)" strokeWidth={1.4} className="h-9 w-9 sm:h-12 sm:w-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                  </svg>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
