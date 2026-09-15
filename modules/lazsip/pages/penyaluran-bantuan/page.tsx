import { listBeneficiariesPublic } from "@/modules/lazsip/api/beneficiaries";
import { BeneficiaryCard } from "@/modules/lazsip/components/BeneficiaryCard";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { FilterChips } from "@/modules/lazsip/components/ui/FilterChips";

const AID_TYPE_LABEL: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  kebutuhan_pokok: "Kebutuhan Pokok",
  lainnya: "Lainnya",
};

export default async function LazsipPenyaluranBantuanPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string }>;
}) {
  const { tipe } = await searchParams;
  const beneficiaries = await listBeneficiariesPublic(tipe);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip#penyaluran">Kembali ke Beranda</BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        Penyaluran Bantuan
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Semua Penerima Bantuan
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
        Sebagian penerima manfaat yang telah dibantu LAZSIP — data ditampilkan sesuai kebijakan privasi penerima.
      </p>

      <div className="mt-8">
        <FilterChips
          options={[{ value: "", label: "Semua" }, ...Object.entries(AID_TYPE_LABEL).map(([value, label]) => ({ value, label }))]}
          value={tipe ?? ""}
          buildHref={(value) => (value ? `/lazsip/penyaluran-bantuan?tipe=${value}` : "/lazsip/penyaluran-bantuan")}
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {beneficiaries.map((item) => (
          <BeneficiaryCard key={item.id} id={item.id} name={item.name} amountReceived={item.amountReceived} aidType={item.aidType} photo={item.photo} />
        ))}
      </div>

      {beneficiaries.length === 0 && (
        <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada data penerima manfaat untuk kategori ini.</p>
      )}
    </div>
  );
}
