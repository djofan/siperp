import { HeroUtilityCard } from "@/modules/lazsip/components/sections/HeroUtilityCard";

interface HeroContent {
  title?: string;
  subtitle?: string;
}

export function Hero({
  hero,
  goldPricePerGram,
  fitrahPricePerJiwa,
}: {
  hero: HeroContent;
  goldPricePerGram: number;
  fitrahPricePerJiwa: number;
}) {
  return (
    <section id="kalkulator-zakat" className="relative overflow-hidden bg-lazsip-primary-900">
      <div
        className="pointer-events-none absolute right-[-15%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-lazsip-secondary-500/[0.14] blur-[130px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 pb-24 pt-36 sm:px-6 sm:pt-44 sm:pb-28 lg:grid-cols-2 lg:items-stretch lg:gap-12 lg:py-40">
        <div className="flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-secondary-200">
            Lembaga Amil Zakat Resmi
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[4rem]">
            {hero.title || "Menyalurkan Kepedulian, Menguatkan Solidaritas Umat"}
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-lazsip-secondary-200 sm:text-lg">
            {hero.subtitle ||
              "LAZSIP membantu Anda menunaikan zakat, infak, dan donasi dengan mudah, aman, dan tersalurkan tepat sasaran."}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <a
              href="#kalkulator-zakat"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-lazsip-primary-900 transition-colors hover:bg-lazsip-primary-50 sm:w-auto"
            >
              Hitung & Bayar Zakat
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href="#donasi"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Donasi Sekarang
            </a>
          </div>
        </div>

        <div className="flex w-full max-w-sm justify-self-center lg:max-w-md lg:justify-self-end">
          <div className="flex w-full flex-col justify-center rounded-3xl bg-white p-7 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.45)] sm:p-8">
            <HeroUtilityCard goldPricePerGram={goldPricePerGram} fitrahPricePerJiwa={fitrahPricePerJiwa} />
          </div>
        </div>
      </div>
    </section>
  );
}
