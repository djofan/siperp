"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";

interface FeeRow {
  id: string;
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

export function PaymentFeeManager({ fees }: { fees: FeeRow[] }) {
  const router = useRouter();
  const [method, setMethod] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feePercentage, setFeePercentage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/lazsip/payment-fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, feeAmount, feePercentage }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan referensi biaya.");
      return;
    }

    setMethod("");
    setFeeAmount("");
    setFeePercentage("");
    router.refresh();
  }

  async function handleDelete(id: string, methodName: string) {
    if (!window.confirm(`Hapus referensi biaya "${methodName}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/lazsip/payment-fees/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-lazsip-primary-100 bg-white p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fee-method" className="text-xs font-medium text-lazsip-primary-800/70">
            Metode Pembayaran
          </label>
          <input
            id="fee-method"
            required
            placeholder="mis. QRIS, Transfer BCA"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-10 rounded-full border border-lazsip-primary-200 bg-white px-4 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fee-amount" className="text-xs font-medium text-lazsip-primary-800/70">
            Biaya Tetap (Rp)
          </label>
          <input
            id="fee-amount"
            type="number"
            min={0}
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            className="h-10 w-36 rounded-full border border-lazsip-primary-200 bg-white px-4 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fee-percentage" className="text-xs font-medium text-lazsip-primary-800/70">
            Biaya Persentase (%)
          </label>
          <input
            id="fee-percentage"
            type="number"
            min={0}
            step="0.1"
            value={feePercentage}
            onChange={(e) => setFeePercentage(e.target.value)}
            className="h-10 w-36 rounded-full border border-lazsip-primary-200 bg-white px-4 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-full bg-lazsip-primary-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {fees.length === 0 ? (
        <AdminEmptyState message="Belum ada referensi biaya." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Metode</th>
                  <th className="px-4 py-3.5 font-semibold">Biaya Tetap</th>
                  <th className="px-4 py-3.5 font-semibold">Biaya Persentase</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {fees.map((fee) => (
                  <tr key={fee.id} className="transition-colors hover:bg-lazsip-primary-50/40">
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900">{fee.method}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">
                      {fee.feeAmount ? `Rp${fee.feeAmount.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{fee.feePercentage ? `${fee.feePercentage}%` : "-"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(fee.id, fee.method)}
                        disabled={deletingId === fee.id}
                        className="text-sm font-medium text-red-600 transition-colors hover:opacity-80 disabled:opacity-50"
                      >
                        {deletingId === fee.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
