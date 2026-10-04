import { splitLines } from "@/modules/sip/api/siteContent";
import { SectionHeading, AccentTitle } from "@/modules/sip/components/ui/SectionHeading";
import { formatNumber } from "@/modules/sip/components/format";

// Tampil/sembunyi (termasuk saat data masih kosong) diputuskan di halaman lewat jangkauanHasData().
export function JangkauanBantuanSection({ content }: { content: Record<string, string> }) {
  const verifikatorCount = Number(content.verifikatorCount) || 0;
  const kotaCount = Number(content.kotaCount) || 0;
  const provinsiCount = Number(content.provinsiCount) || 0;
  const kotaList = splitLines(content.kotaList);

  return (
    <section id="jangkauan-bantuan" className="sip-band-tint py-14 sm:py-20">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={<AccentTitle text={content.title} />}
          description={content.description}
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(33,53,4,0.04),0_8px_24px_-12px_rgba(33,53,4,0.12)]">
            <p className="text-4xl font-bold tracking-tight text-sip-primary-900 sm:text-5xl">{formatNumber(verifikatorCount)}</p>
            <p className="mt-2 text-sm text-sip-primary-900/55">Verifikator SIP</p>
          </div>
          <div className="rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(33,53,4,0.04),0_8px_24px_-12px_rgba(33,53,4,0.12)]">
            <p className="text-4xl font-bold tracking-tight text-sip-primary-900 sm:text-5xl">{formatNumber(kotaCount)}</p>
            <p className="mt-2 text-sm text-sip-primary-900/55">Kota/Kabupaten</p>
          </div>
          <div className="rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(33,53,4,0.04),0_8px_24px_-12px_rgba(33,53,4,0.12)]">
            <p className="text-4xl font-bold tracking-tight text-sip-primary-900 sm:text-5xl">{formatNumber(provinsiCount)}</p>
            <p className="mt-2 text-sm text-sip-primary-900/55">Provinsi</p>
          </div>
        </div>

        {kotaList.length > 0 && (
          <div className="mt-5 rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(33,53,4,0.04),0_8px_24px_-12px_rgba(33,53,4,0.12)]">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-sip-primary-600">Wilayah Terjangkau</h3>
            <div className="flex flex-wrap gap-2">
              {kotaList.map((kota) => (
                <span
                  key={kota}
                  className="rounded-full bg-sip-primary-50 px-3.5 py-1.5 text-xs font-medium text-sip-primary-800"
                >
                  {kota}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
