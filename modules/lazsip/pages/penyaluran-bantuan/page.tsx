import { listBeneficiariesPublic, listDistinctVerifierNames } from "@/modules/lazsip/api/beneficiaries";
import { BeneficiaryCard } from "@/modules/lazsip/components/BeneficiaryCard";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { FilterChips } from "@/modules/lazsip/components/ui/FilterChips";

const AID_TYPE_LABEL: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  kebutuhan_pokok: "Kebutuhan Pokok",
  lainnya: "Lainnya",
};

function buildHref(params: { tipe?: string; verifikator?: string }) {
  const query = new URLSearchParams();
  if (params.tipe) query.set("tipe", params.tipe);
  if (params.verifikator) query.set("verifikator", params.verifikator);
  const qs = query.toString();
  return qs ? `/lazsip/penyaluran-bantuan?${qs}` : "/lazsip/penyaluran-bantuan";
}

export default async function LazsipPenyaluranBantuanPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string; verifikator?: string }>;
}) {
  const { tipe, verifikator } = await searchParams;
  const [beneficiaries, verifierNames] = await Promise.all([
    listBeneficiariesPublic(tipe, verifikator),
    listDistinctVerifierNames(),
  ]);

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

      <div className="mt-8 flex flex-col gap-3">
        <FilterChips
          options={[{ value: "", label: "Semua Tipe" }, ...Object.entries(AID_TYPE_LABEL).map(([value, label]) => ({ value, label }))]}
          value={tipe ?? ""}
          buildHref={(value) => buildHref({ tipe: value, verifikator })}
        />
        {verifierNames.length > 0 && (
          <FilterChips
            options={[{ value: "", label: "Semua Verifikator" }, ...verifierNames.map((name) => ({ value: name, label: name }))]}
            value={verifikator ?? ""}
            buildHref={(value) => buildHref({ tipe, verifikator: value })}
          />
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-5 lg:grid-cols-5">
        {beneficiaries.map((item) => (
          <BeneficiaryCard
            key={item.id}
            id={item.id}
            name={item.name}
            age={item.age}
            amountReceived={item.amountReceived}
            aidType={item.aidType}
            photo={item.photo}
            verifierArea={item.verifierArea}
          />
        ))}
      </div>

      {beneficiaries.length === 0 && (
        <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada data penerima manfaat untuk kategori ini.</p>
      )}
    </div>
  );
}
