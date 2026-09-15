"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TransactionActions({
  id,
  type,
}: {
  id: string;
  type: "donasi" | "zakat";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actioning, setActioning] = useState<"paid" | "failed" | null>(null);

  function simulate(status: "paid" | "failed") {
    if (
      !window.confirm(
        `Tandai transaksi ini sebagai "${status === "paid" ? "Lunas" : "Gagal"}"? Ini simulasi manual selama payment gateway belum terpasang.`
      )
    ) {
      return;
    }
    setActioning(status);
    startTransition(async () => {
      const endpoint =
        type === "donasi"
          ? `/api/lazsip/donations/${id}/simulate-payment`
          : `/api/lazsip/zakat/${id}/simulate-payment`;
      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setActioning(null);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={() => simulate("paid")}
        disabled={isPending}
        className="text-xs font-medium text-success hover:opacity-80 disabled:opacity-50"
      >
        {actioning === "paid" ? "..." : "Tandai Lunas"}
      </button>
      <button
        type="button"
        onClick={() => simulate("failed")}
        disabled={isPending}
        className="text-xs font-medium text-danger hover:opacity-80 disabled:opacity-50"
      >
        {actioning === "failed" ? "..." : "Tandai Gagal"}
      </button>
    </div>
  );
}
