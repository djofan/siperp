"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TransactionActions({
  id,
  source,
  gateway,
}: {
  id: string;
  source: "legacy-donation" | "payment" | "zakat";
  gateway?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actioning, setActioning] = useState<"paid" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isGateway = source === "payment" && gateway !== "simulation";
  function syncGateway() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/payment/gateway-status/${encodeURIComponent(id)}`, { method: "POST" });
        const body = await response.json();
        if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message ?? "Status belum dapat diverifikasi.");
        router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Koneksi gagal."); }
    });
  }
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
          const message = typeof body?.error === "string" ? body.error : body?.error?.message;
          setError(typeof message === "string" ? message : "Gagal memperbarui transaksi.");
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
    <div className="ml-auto flex w-max min-w-32 flex-col items-stretch gap-2" aria-busy={isPending}>
      {error && <p role="alert" className="max-w-52 whitespace-normal text-xs leading-relaxed text-danger">{error}</p>}
      {isGateway ? <button type="button" disabled={isPending} onClick={syncGateway} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-lazsip-primary-300 bg-lazsip-primary-50 px-3 py-2 text-xs font-semibold text-lazsip-primary-900 disabled:opacity-50 dark:border-white/20 dark:bg-white/5 dark:text-white">{isPending ? "Memeriksa..." : "Sinkronkan iPaymu"}</button> : <>
      <button
        type="button"
        onClick={() => simulate("paid")}
        disabled={isPending}
        className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
        {actioning === "paid" ? "Memproses..." : "Tandai Lunas"}
      </button>
      <button
        type="button"
        onClick={() => simulate("failed")}
        disabled={isPending}
        className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
        {actioning === "failed" ? "Memproses..." : "Tandai Gagal"}
      </button>
      </>}
    </div>
  );
}
