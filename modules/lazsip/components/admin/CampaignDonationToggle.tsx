"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";

export function CampaignDonationToggle({
  campaignId,
  initialStatus,
}: {
  campaignId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialStatus === "active");
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setActive(next);
    startTransition(async () => {
      await fetch(`/api/lazsip/campaigns/${campaignId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "active" : "completed" }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Toggle checked={active} onChange={handleChange} disabled={isPending} label="Aktifkan/nonaktifkan tombol Donasi" />
      <span className={`text-xs font-medium ${active ? "text-lazsip-secondary-700 dark:text-lazsip-secondary-300" : "text-amber-700 dark:text-amber-400"}`}>
        {active ? "Aktif" : "Selesai"}
      </span>
    </div>
  );
}
