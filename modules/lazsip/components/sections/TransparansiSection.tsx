import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { LAZSIP_SITE_CONTENT_DEFAULTS } from "@/modules/lazsip/api/siteContentDefaults";
import { formatRupiah, formatNumber } from "@/modules/lazsip/components/format";
import { StatCounter } from "@/modules/lazsip/components/ui/StatCounter";

export async function TransparansiSection() {
  const transparansi = await getSiteContent("transparansi");
  const defaults = LAZSIP_SITE_CONTENT_DEFAULTS.transparansi;

  // Angka-angka ini diisi manual lewat admin Konten Umum, BUKAN dihitung otomatis dari
  // database — total dana/donatur riil butuh rekonsiliasi laporan yang gak selalu cocok
  // 1:1 dengan data di sistem (mis. donasi lama sebelum sistem admin baru berjalan).
  const totalDana = Number(transparansi?.totalDana ?? defaults.totalDana) || 0;
  const totalDonatur = Number(transparansi?.totalDonatur ?? defaults.totalDonatur) || 0;
  const totalPenerima = Number(transparansi?.totalPenerima ?? defaults.totalPenerima) || 0;

  return (
    <section id="transparansi" className="bg-lazsip-primary-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-10">
          <span className="mb-4 inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-secondary-200">
            Transparansi
          </span>
          <h2 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
            Dikelola Amanah, Dilaporkan Terbuka
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-200 sm:text-lg">
            Kami hanya menampilkan angka agregat untuk menjaga privasi donatur dan penerima manfaat — bukan daftar
            transaksi perorangan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCounter icon="fund" value={formatRupiah(totalDana)} label="Total dana terkumpul" />
          <StatCounter icon="donors" value={`${formatNumber(totalDonatur)}+`} label="Donatur & muzakki" />
          <StatCounter icon="beneficiaries" value={`${formatNumber(totalPenerima)}+`} label="Penerima manfaat terbantu" />
        </div>
      </div>
    </section>
  );
}
