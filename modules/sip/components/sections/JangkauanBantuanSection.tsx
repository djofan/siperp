import { getSiteContent } from "@/modules/sip/api/siteContent";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { formatNumber } from "@/modules/sip/components/format";

export async function JangkauanBantuanSection() {
  const content = await getSiteContent("jangkauanBantuan");

  const verifikatorCount = Number(content?.verifikatorCount) || 0;
  const kotaCount = Number(content?.kotaCount) || 0;
  const provinsiCount = Number(content?.provinsiCount) || 0;
  const kotaList = content?.kotaList
    ? content.kotaList.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  // Belum ada data nyata yang diisi admin — jangan tampilkan section stats kosong (0/0/0)
  // yang kelihatan seperti bug, daripada nampilin angka palsu.
  const hasData = verifikatorCount > 0 || kotaCount > 0 || provinsiCount > 0 || kotaList.length > 0;
  if (!hasData) return null;

  return (
    <section id="jangkauan-bantuan" className="bg-sip-primary-50/50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Profil"
          title="Jangkauan Bantuan SIP"
          description="Tim verifikator SIP tersebar di berbagai wilayah Indonesia untuk memastikan bantuan tepat sasaran."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-3xl font-extrabold text-sip-primary-900">{formatNumber(verifikatorCount)}</p>
            <p className="mt-1 text-sm text-sip-primary-800/60">Verifikator SIP</p>
          </div>
          <div className="rounded-3xl bg-white p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-3xl font-extrabold text-sip-primary-900">{formatNumber(kotaCount)}</p>
            <p className="mt-1 text-sm text-sip-primary-800/60">Kota/Kabupaten</p>
          </div>
          <div className="rounded-3xl bg-white p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-3xl font-extrabold text-sip-primary-900">{formatNumber(provinsiCount)}</p>
            <p className="mt-1 text-sm text-sip-primary-800/60">Provinsi</p>
          </div>
        </div>

        {kotaList.length > 0 && (
          <div className="mt-5 rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-sip-primary-800/60">Wilayah Terjangkau</h3>
            <div className="flex flex-wrap gap-2">
              {kotaList.map((kota) => (
                <span
                  key={kota}
                  className="rounded-full bg-sip-primary-50 px-3.5 py-1.5 text-xs font-medium text-sip-primary-800/80"
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
