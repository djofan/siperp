import { HeroUtilityCard } from "@/modules/lazsip/components/sections/HeroUtilityCard";
import { SectionLink } from "../SectionLink";

interface HeroContent {
  title?: string;
  subtitle?: string;
}

export function Hero({
  hero,
  goldPricePerGram,
  fitrahPricePerJiwa,
  whatsapp,
}: {
  hero: HeroContent;
  goldPricePerGram: number;
  fitrahPricePerJiwa: number;
  whatsapp?: string;
}) {
  return (
    <section id="kalkulator-zakat" className="relative overflow-hidden bg-[#fafbf7]">
      <div
        className="pointer-events-none absolute right-[-15%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-lazsip-secondary-500/[0.10] blur-[130px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-5 pb-24 pt-40 sm:px-8 sm:pt-48 sm:pb-28 lg:grid-cols-2 lg:items-stretch lg:gap-12 lg:py-40">
        <div className="flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
            Lembaga Amil Zakat Resmi
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-lazsip-primary-900 sm:text-6xl lg:text-[4rem]">
            {hero.title || "Menyalurkan Kepedulian, Menguatkan Solidaritas Umat"}
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-lazsip-primary-800/80 sm:text-lg">
            {hero.subtitle ||
              "LAZSIP membantu Anda menunaikan zakat, infak, dan donasi dengan mudah, aman, dan tersalurkan tepat sasaran."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <a
              href="#kalkulator-zakat"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lazsip-primary-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
            >
              Hitung & Bayar Zakat
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <SectionLink
              href="#donasi"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-lazsip-primary-200 bg-white px-6 py-3 text-sm font-semibold text-lazsip-primary-900 transition-colors hover:bg-lazsip-primary-50"
            >
              Donasi Sekarang
            </SectionLink>
          </div>
        </div>

        <div className="flex w-full max-w-sm justify-self-center lg:max-w-md lg:justify-self-end">
          <div className="flex w-full flex-col justify-center rounded-3xl border border-lazsip-primary-100 bg-white p-7 shadow-[0_20px_60px_-20px_rgba(35,65,25,0.16)] sm:p-8">
            <HeroUtilityCard goldPricePerGram={goldPricePerGram} fitrahPricePerJiwa={fitrahPricePerJiwa} whatsapp={whatsapp} />
          </div>
        </div>
      </div>
    </section>
  );
}
