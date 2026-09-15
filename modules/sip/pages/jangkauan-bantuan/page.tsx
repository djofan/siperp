import { getSiteContent } from "@/modules/sip/api/siteContent";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { formatNumber } from "@/modules/sip/components/format";

export default async function JangkauanBantuanPage() {
  const content = await getSiteContent("jangkauanBantuan");

  const verifikatorCount = Number(content?.verifikatorCount) || 0;
  const kotaCount = Number(content?.kotaCount) || 0;
  const provinsiCount = Number(content?.provinsiCount) || 0;
  const kotaList = content?.kotaList
    ? content.kotaList.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading
        eyebrow="Profil"
        title="Jangkauan Bantuan SIP"
        description="Tim verifikator SIP tersebar di berbagai wilayah Indonesia untuk memastikan bantuan tepat sasaran."
      />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-sip-primary-100 bg-white p-5 text-center">
          <p className="text-3xl font-extrabold text-sip-primary-900">{formatNumber(verifikatorCount)}</p>
          <p className="mt-1 text-sm text-sip-primary-800/60">Verifikator SIP</p>
        </div>
        <div className="rounded-2xl border border-sip-primary-100 bg-white p-5 text-center">
          <p className="text-3xl font-extrabold text-sip-primary-900">{formatNumber(kotaCount)}</p>
          <p className="mt-1 text-sm text-sip-primary-800/60">Kota/Kabupaten</p>
        </div>
        <div className="rounded-2xl border border-sip-primary-100 bg-white p-5 text-center">
          <p className="text-3xl font-extrabold text-sip-primary-900">{formatNumber(provinsiCount)}</p>
          <p className="mt-1 text-sm text-sip-primary-800/60">Provinsi</p>
        </div>
      </div>

      {kotaList.length > 0 && (
        <div className="mt-6 rounded-3xl border border-sip-primary-100 bg-white p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-sip-primary-800/60">Wilayah Terjangkau</h3>
          <div className="flex flex-wrap gap-2">
            {kotaList.map((kota) => (
              <span key={kota} className="rounded-full border border-sip-primary-100 bg-sip-primary-50/60 px-3.5 py-1.5 text-xs font-medium text-sip-primary-800/80">
                {kota}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
