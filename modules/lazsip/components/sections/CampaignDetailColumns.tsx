import type { ReactNode } from "react";
import { DonationForm } from "@/modules/lazsip/components/sections/DonationForm";

interface FeeRef {
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

export function CampaignDetailColumns({ articleTop, campaignId, uniqueCode, feeRefs, isActive }: {
  articleTop: ReactNode;
  campaignId: string;
  uniqueCode: string;
  feeRefs: FeeRef[];
  isActive: boolean;
}) {
  return <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10">
    <article className="order-2 min-w-0 lg:order-1">{articleTop}</article>
    <div className="order-1 min-w-0 lg:order-2">
      {isActive ? <DonationForm campaignId={campaignId} uniqueCode={uniqueCode} feeRefs={feeRefs} /> :
        <p className="rounded-3xl border border-lazsip-primary-100 bg-white p-6 text-sm font-medium text-lazsip-primary-800/60">Campaign ini sudah selesai. Terima kasih atas dukungannya!</p>}
    </div>
  </div>;
}
