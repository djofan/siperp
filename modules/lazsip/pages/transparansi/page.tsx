import { getTotalDonationsPaid, getTotalZakatPaid, listDonors } from "@/modules/lazsip/api/donors";
import { countBeneficiaries } from "@/modules/lazsip/api/beneficiaries";
import { formatRupiah, formatNumber } from "@/modules/lazsip/components/format";
import { StatCounter } from "@/modules/lazsip/components/ui/StatCounter";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function LazsipTransparansiPage() {
  const [totalDonations, totalZakat, donors, beneficiaryCount] = await Promise.all([
    getTotalDonationsPaid(),
    getTotalZakatPaid(),
    listDonors(),
    countBeneficiaries(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip#transparansi">Kembali ke Beranda</BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        Transparansi
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Dikelola Amanah, Dilaporkan Terbuka
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
        Kami hanya menampilkan angka agregat untuk menjaga privasi donatur dan penerima manfaat.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCounter icon="fund" value={formatRupiah(totalDonations + totalZakat)} label="Total dana terkumpul" className="border border-lazsip-primary-100" />
        <StatCounter icon="donors" value={`${formatNumber(donors.length)}+`} label="Donatur & muzakki" className="border border-lazsip-primary-100" />
        <StatCounter icon="beneficiaries" value={`${formatNumber(beneficiaryCount)}+`} label="Penerima manfaat terbantu" className="border border-lazsip-primary-100" />
      </div>
    </div>
  );
}
