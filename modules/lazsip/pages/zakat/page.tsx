import { listPaymentFeeRefs } from "@/modules/lazsip/api/paymentFees";
import { getGoldPricePerGram } from "@/modules/lazsip/api/goldPrice";
import { ZakatCalculator } from "@/modules/lazsip/components/sections/ZakatCalculator";

export default async function LazsipZakatPage({
  searchParams,
}: {
  searchParams: Promise<{ harta?: string }>;
}) {
  const { harta } = await searchParams;
  const [feeRefs, goldPricePerGram] = await Promise.all([listPaymentFeeRefs(), getGoldPricePerGram()]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <div className="mb-8 flex flex-col gap-2">
        <span className="inline-flex w-fit items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
          Kalkulator Zakat
        </span>
        <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
          Hitung & Bayar Zakat
        </h1>
        <p className="text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
          Hitung otomatis kewajiban zakat maal berdasarkan nisab 85 gram emas.
        </p>
      </div>
      <ZakatCalculator feeRefs={feeRefs} goldPricePerGram={goldPricePerGram} initialHarta={harta} />
    </div>
  );
}
