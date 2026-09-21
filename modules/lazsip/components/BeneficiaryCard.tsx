import Link from "next/link";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { PINNED_OVERLAY_STYLE } from "@/modules/lazsip/components/ui/pinnedOverlay";
import { formatRupiah } from "@/modules/lazsip/components/format";

const AID_TYPE_LABEL: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  kebutuhan_pokok: "Kebutuhan Pokok",
  lainnya: "Lainnya",
};

interface BeneficiaryCardProps {
  id: string;
  name: string;
  age: number;
  amountReceived: number;
  aidType: string;
  photo: string | null;
  verifierArea: string;
  featured?: boolean;
}

export function BeneficiaryCard({ id, name, age, amountReceived, aidType, photo, verifierArea, featured = false }: BeneficiaryCardProps) {
  if (featured) {
    return (
      <Link href={`/lazsip/penyaluran-bantuan/${id}`} className="group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl">
        <ImagePlaceholder variant="person" src={photo} alt={name} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />

        <span className="relative z-10 m-2.5 w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {AID_TYPE_LABEL[aidType] ?? aidType}
        </span>

        <div className="relative z-10 mt-auto flex flex-col gap-1 p-3 text-white">
          <h3 className="line-clamp-1 text-sm font-bold leading-snug">{name}</h3>
          <p className="text-[11px] text-white/75">
            {age} tahun · {verifierArea}
          </p>
          <p className="mt-1.5 text-[11px] font-semibold text-lazsip-secondary-200">
            Bantuan tersalurkan {formatRupiah(amountReceived)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/lazsip/penyaluran-bantuan/${id}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-lg hover:shadow-lazsip-primary-900/10"
    >
      <div className="relative">
        <ImagePlaceholder variant="person" src={photo} alt={name} className="aspect-[3/4] w-full" />
        <span className="absolute left-2 top-2 rounded-full bg-lazsip-primary-900/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {AID_TYPE_LABEL[aidType] ?? aidType}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-1 text-sm font-bold text-lazsip-primary-900 group-hover:text-lazsip-primary-700">{name}</h3>
        <p className="text-[11px] text-lazsip-primary-800/60">
          {age} tahun · {verifierArea}
        </p>
        <p className="mt-auto pt-1 text-[11px] font-semibold text-lazsip-secondary-700">
          Bantuan tersalurkan {formatRupiah(amountReceived)}
        </p>
      </div>
    </Link>
  );
}
