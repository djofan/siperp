import styles from "./CampaignDetailColumns.module.css";
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
  return <div className={styles.layout}>
    <div className={styles.payment}>
      {isActive ? <DonationForm campaignId={campaignId} uniqueCode={uniqueCode} feeRefs={feeRefs} /> :
        <p className="rounded-3xl border border-lazsip-primary-100 bg-white p-6 text-sm font-medium text-lazsip-primary-800/60">Campaign ini sudah selesai. Terima kasih atas dukungannya!</p>}
    </div>
    <article className={styles.article}>{articleTop}</article>
  </div>;
}
