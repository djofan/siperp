import Link from "next/link";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { PINNED_OVERLAY_STYLE } from "@/modules/lazsip/components/ui/pinnedOverlay";
import { PinnedMark } from "@/modules/lazsip/components/ui/PinnedMark";
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
  const area = verifierArea.split(",")[0].trim().replace(/^Kabupaten\s+/i, "Kab. ").replace(/^Kecamatan\s+/i, "Kec. ");
  const label = AID_TYPE_LABEL[aidType] ?? aidType;
  if (featured) {
    return (
      <Link href={`/lazsip/penyaluran-bantuan/${id}`} className="group relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[22px]">
        <ImagePlaceholder variant="person" src={photo} alt={name} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />

        <div className="relative z-10 flex min-w-0 items-start gap-2 p-3.5">
          <PinnedMark />
          <span className="min-w-0 rounded-xl bg-white/20 px-2.5 py-1 text-[11px] font-semibold leading-snug text-white backdrop-blur-sm [overflow-wrap:anywhere]">
            {label}
          </span>
        </div>

        <div className="relative z-10 mt-auto flex flex-col gap-1.5 p-4 text-white">
          <h3 className="line-clamp-1 text-base font-bold leading-snug">{name}</h3>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-white/75">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            <span className="truncate" title={verifierArea}>{area || "Lokasi belum tersedia"}</span>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-white/75">Tersalurkan</p>
            <p className="truncate text-sm font-bold text-lazsip-secondary-200">{formatRupiah(amountReceived)}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/lazsip/penyaluran-bantuan/${id}`}
      className="group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazsip-primary-500"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
        <ImagePlaceholder variant="person" src={photo} alt={name} className="absolute inset-0 h-full w-full" />
      </div>

      <div className="flex min-w-0 flex-col gap-1 p-3 sm:p-3.5">
        <span className="mb-1 self-start max-w-full rounded-lg bg-lazsip-primary-50 px-2 py-1 text-[11px] font-semibold leading-snug text-lazsip-primary-800 [overflow-wrap:anywhere]">{label}</span>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-lazsip-primary-900 group-hover:text-lazsip-primary-700">{name}</h3>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-lazsip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
          <span className="truncate" title={`${age} tahun · ${verifierArea}`}>{area || "Lokasi belum tersedia"}</span>
        </span>
        <div className="min-w-0 pt-1.5">
          <p className="text-[10px] font-medium text-lazsip-primary-800/65">Tersalurkan</p>
          <p className="break-words text-sm font-bold leading-snug text-lazsip-primary-900 sm:text-base">{formatRupiah(amountReceived)}</p>
        </div>
      </div>
    </Link>
  );
}
