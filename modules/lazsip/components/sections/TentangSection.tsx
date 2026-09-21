import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { listPartners } from "@/modules/lazsip/api/partners";
import { listDistinctVerifierAreas, countDistinctVerifiers } from "@/modules/lazsip/api/beneficiaries";
import { formatNumber } from "@/modules/lazsip/components/format";
import { lazsipSiteConfig } from "@/modules/lazsip/components/siteConfig";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";
import { StatCounter } from "@/modules/lazsip/components/ui/StatCounter";

const WILAYAH_DISPLAY_LIMIT = 12;

const DEFAULT_VISI =
  "Menjadi lembaga amil zakat yang amanah, transparan, dan profesional dalam menghimpun serta menyalurkan zakat, infak, dan sedekah untuk kesejahteraan umat.";

const DEFAULT_MISI = [
  "Menghimpun dana zakat, infak, dan sedekah dari masyarakat secara amanah.",
  "Menyalurkan bantuan tepat sasaran kepada mustahik yang berhak menerima.",
  "Mengelola dana dengan transparan dan dapat dipertanggungjawabkan.",
];

const DEFAULT_LEGALITAS =
  "LAZSIP adalah Lembaga Amil Zakat Solidaritas Insan Peduli, bernaung di bawah Yayasan Solidaritas Insan Peduli.";

export async function TentangSection() {
  const [tentang, legalitas, partners, wilayahCakupan, totalVerifikator] = await Promise.all([
    getSiteContent("tentang"),
    getSiteContent("legalitas"),
    listPartners(),
    listDistinctVerifierAreas(),
    countDistinctVerifiers(),
  ]);

  const wilayahShown = wilayahCakupan.slice(0, WILAYAH_DISPLAY_LIMIT);
  const wilayahSisa = wilayahCakupan.length - wilayahShown.length;

  const misiItems = tentang?.misi
    ? tentang.misi
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : DEFAULT_MISI;

  const legalitasItems = (legalitas?.body || DEFAULT_LEGALITAS)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section id="tentang" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Tentang Kami"
        title="Mengenal LAZSIP Lebih Dekat"
        description={tentang?.body || "Konten tentang LAZSIP belum diisi lewat halaman admin Konten Umum."}
      />

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <div className="flex flex-col justify-between gap-5">
          <StatCounter icon="calendar" value={`${lazsipSiteConfig.foundedYear}`} label="Berdiri sejak" className="border border-lazsip-primary-100" />
          <StatCounter
            icon="donors"
            value={formatNumber(totalVerifikator)}
            label="Verifikator lapangan terlatih"
            className="border border-lazsip-primary-100"
          />
          <StatCounter
            icon="beneficiaries"
            value={`${formatNumber(partners.length)}+`}
            label="Mitra kerja sama"
            className="border border-lazsip-primary-100"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-lazsip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
              </svg>
              Visi
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-lazsip-secondary-700">{tentang?.visi || DEFAULT_VISI}</p>
          </div>

          <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-lazsip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Misi
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-lazsip-secondary-700">
              {misiItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-lazsip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              Legalitas
            </h3>
            <ul className="mt-3 grid grid-cols-1 gap-2.5 text-sm text-lazsip-primary-800/75 sm:grid-cols-2 lg:grid-cols-1">
              {legalitasItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-lazsip-primary-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {wilayahCakupan.length > 0 && (
        <div className="mt-6 rounded-2xl border border-lazsip-primary-100 bg-white p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-lazsip-primary-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            Wilayah Cakupan Verifikator
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {wilayahShown.map((wilayah) => (
              <span
                key={wilayah}
                className="rounded-full border border-lazsip-primary-100 bg-lazsip-primary-50/60 px-3.5 py-1.5 text-xs font-medium text-lazsip-primary-800/80"
              >
                {wilayah}
              </span>
            ))}
            {wilayahSisa > 0 && (
              <span className="rounded-full border border-lazsip-primary-200 bg-lazsip-primary-900 px-3.5 py-1.5 text-xs font-semibold text-white">
                +{wilayahSisa} Lainnya
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
