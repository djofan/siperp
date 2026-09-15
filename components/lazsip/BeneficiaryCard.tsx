import Link from "next/link";
import { ImagePlaceholder } from "@/components/lazsip/ui/ImagePlaceholder";
import { PINNED_OVERLAY_STYLE } from "@/components/lazsip/ui/pinnedOverlay";
import { formatRupiah } from "@/components/lazsip/format";

const AID_TYPE_LABEL: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  kebutuhan_pokok: "Kebutuhan Pokok",
  lainnya: "Lainnya",
};

interface BeneficiaryCardProps {
  id: string;
  name: string;
  amountReceived: number;
  aidType: string;
  photo: string | null;
}

export function BeneficiaryCard({ id, name, amountReceived, aidType, photo }: BeneficiaryCardProps) {
  return (
    <Link
      href={`/lazsip/penyaluran-bantuan/${id}`}
      className="group relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-2xl"
    >
      <ImagePlaceholder variant="person" src={photo} alt={name} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />

      <span className="relative z-10 m-3 w-fit rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        {AID_TYPE_LABEL[aidType] ?? aidType}
      </span>

      <div className="relative z-10 mt-auto flex flex-col gap-1 p-4 text-white">
        <h3 className="line-clamp-1 text-sm font-bold leading-snug">{name}</h3>
        <p className="mt-1.5 border-t border-white/15 pt-1.5 text-xs font-semibold text-lazsip-secondary-200">
          Bantuan tersalurkan {formatRupiah(amountReceived)}
        </p>
      </div>
    </Link>
  );
}
