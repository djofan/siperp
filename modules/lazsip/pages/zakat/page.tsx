import { listCheckoutMethods as listPaymentFeeRefs } from "@/modules/lazsip/api/paymentFees";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { LAZSIP_SITE_CONTENT_DEFAULTS } from "@/modules/lazsip/api/siteContentDefaults";
import { ZakatPaymentForm } from "@/modules/lazsip/components/sections/ZakatPaymentForm";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function LazsipZakatPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; amount?: string }>;
}) {
  const { type, amount } = await searchParams;
  const [feeRefs, legalitas] = await Promise.all([listPaymentFeeRefs(), getSiteContent("legalitas")]);

  const legalitasBody = legalitas?.body || LAZSIP_SITE_CONTENT_DEFAULTS.legalitas.body;
  const whatsapp = process.env.NEXT_PUBLIC_LAZSIP_WHATSAPP;
  const jemputMessage = encodeURIComponent(
    "Assalamu'alaikum, saya ingin menjadwalkan penjemputan zakat oleh tim LAZSIP."
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip">Kembali ke Beranda</BackLink>

      <div className="mb-8 mt-6 flex flex-col gap-2">
        <span className="inline-flex w-fit items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
          Bayar Zakat
        </span>
        <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
          Tunaikan Zakat Anda
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
          Sudah tahu nominal zakat Anda? Langsung isi form di bawah. Belum tahu? Pakai kalkulator zakat di beranda
          untuk menghitungnya lebih dulu. Dana zakat Anda disalurkan lewat rekening khusus zakat, terpisah dari
          donasi/infaq.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl border border-lazsip-primary-100 bg-white p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-lazsip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              Tentang LAZSIP
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-lazsip-secondary-700">{legalitasBody}</p>
          </div>

          <div className="rounded-3xl border border-lazsip-primary-100 bg-white p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-lazsip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Kenapa Bayar Zakat di LAZSIP?
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm text-lazsip-primary-800/75">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
                Dikelola lembaga amil zakat resmi, dana zakat settle ke rekening khusus, terpisah dari donasi/infaq.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
                Nisab zakat maal dihitung otomatis dari harga emas terkini.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
                Disalurkan tepat sasaran kepada mustahik yang berhak menerima.
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-lazsip-primary-100 bg-white p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lazsip-primary-50 text-lazsip-primary-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l3-8h12l3 8M3 13v6a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-6M3 13h18M7 16.5h.01M17 16.5h.01" />
              </svg>
            </span>
            <h2 className="text-base font-bold text-lazsip-primary-900">Layanan Jemput Zakat</h2>
            <p className="text-sm leading-relaxed text-lazsip-primary-800/70">
              Nominal zakat besar atau tidak sempat transfer sendiri? Tim LAZSIP siap datang langsung menjemput zakat
              ke rumah atau kantor Anda — tanpa biaya tambahan.
            </p>
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}?text=${jemputMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
              >
                Jadwalkan Penjemputan
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            ) : (
              <p className="text-xs text-lazsip-primary-800/50">Hubungi kantor LAZSIP untuk menjadwalkan penjemputan zakat.</p>
            )}
          </div>
        </div>

        <ZakatPaymentForm feeRefs={feeRefs} initialType={type} initialAmount={amount} />
      </div>
    </div>
  );
}
