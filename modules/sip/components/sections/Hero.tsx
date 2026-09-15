interface HeroContent {
  title?: string;
  subtitle?: string;
  whatsappUrl?: string;
  infaqUrl?: string;
}

export function Hero({ hero }: { hero: HeroContent }) {
  const infaqHref = hero.infaqUrl || "/lazsip/donasi";
  const bantuanHref = hero.whatsappUrl || "/sip/kontak";

  return (
    <section className="relative overflow-hidden bg-sip-primary-900">
      <div
        className="pointer-events-none absolute right-[-15%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-sip-secondary-500/[0.14] blur-[130px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[-10%] bottom-[-15%] h-[26rem] w-[26rem] rounded-full bg-sip-accent/[0.1] blur-[130px]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-24 pt-36 text-center sm:px-6 sm:pt-44 sm:pb-28 lg:py-44">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-sip-secondary-200">
          Ikhlas — Murni Sosial
        </span>

        <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[4rem]">
          {hero.title || "Bahagia dengan Membahagiakan Orang Lain"}
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-sip-secondary-200 sm:text-lg">
          {hero.subtitle ||
            "Solidaritas Insan Peduli menyalurkan bantuan dana infaq, sedekah, dan zakat kepada mereka yang membutuhkan secara cepat dan tepat sasaran."}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href={infaqHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sip-accent px-6 py-3 text-sm font-semibold text-sip-ink transition-colors hover:bg-sip-accent-hover sm:w-auto"
          >
            Infaq Sekarang
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <a
            href={bantuanHref}
            target={hero.whatsappUrl ? "_blank" : undefined}
            rel={hero.whatsappUrl ? "noopener noreferrer" : undefined}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Pengajuan Bantuan
          </a>
        </div>
      </div>
    </section>
  );
}
