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
      <Link href={`/lazsip/penyaluran-bantuan/${id}`} className="group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-[22px]">
        <ImagePlaceholder variant="person" src={photo} alt={name} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />

        <span className="relative z-10 m-3.5 w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {AID_TYPE_LABEL[aidType] ?? aidType}
        </span>

        <div className="relative z-10 mt-auto flex flex-col gap-1.5 p-4 text-white">
          <h3 className="line-clamp-1 text-base font-bold leading-snug">{name}</h3>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-white/75">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            <span className="truncate">{age} tahun · {verifierArea}</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-wide text-white/60">Bantuan tersalurkan</p>
            <p className="truncate text-sm font-bold text-lazsip-secondary-200">{formatRupiah(amountReceived)}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/lazsip/penyaluran-bantuan/${id}`}
      className="group flex aspect-[3/4] h-full w-full flex-col overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white transition-colors duration-200 hover:border-lazsip-primary-300 hover:shadow-lg hover:shadow-lazsip-primary-900/5"
    >
      <div className="relative flex-1 overflow-hidden">
        <ImagePlaceholder variant="person" src={photo} alt={name} className="absolute inset-0 h-full w-full" />
        <span className="absolute left-2 top-2 rounded-full bg-lazsip-primary-900/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {AID_TYPE_LABEL[aidType] ?? aidType}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden p-3.5">
        <h3 className="line-clamp-1 text-sm font-bold text-lazsip-primary-900 group-hover:text-lazsip-primary-700">{name}</h3>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-lazsip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
          <span className="truncate">{age} tahun · {verifierArea}</span>
        </span>
        <div className="min-w-0 pt-1">
          <p className="truncate text-[10px] uppercase tracking-wide text-lazsip-primary-800/45">Bantuan tersalurkan</p>
          <p className="truncate text-sm font-bold text-lazsip-secondary-700">{formatRupiah(amountReceived)}</p>
        </div>
      </div>
    </Link>
  );
}
