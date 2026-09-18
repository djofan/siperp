"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TransactionActions({
  id,
  source,
}: {
  id: string;
  source: "legacy-donation" | "payment" | "zakat";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actioning, setActioning] = useState<"paid" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpoint = source === "payment"
    ? `/api/payment/simulate-payment/${id}`
    : source === "legacy-donation"
      ? `/api/lazsip/donations/${id}/simulate-payment`
      : `/api/lazsip/zakat/${id}/simulate-payment`;

  function simulate(status: "paid" | "failed") {
    if (
      !window.confirm(
        `Tandai transaksi ini sebagai "${status === "paid" ? "Lunas" : "Gagal"}"? Ini simulasi manual selama payment gateway belum terpasang.`
      )
    ) {
      return;
    }
    setActioning(status);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error ?? "Gagal memperbarui transaksi.");
          return;
        }
        router.refresh();
      } catch {
        setError("Koneksi gagal. Silakan coba lagi.");
      } finally {
        setActioning(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {error && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
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
