"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { panelClasses } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  kind: "donasi" | "penyesuaian";
  label: string;
  amount: number;
  createdAt: Date;
}

const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
const formatDateTime = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);

export function CampaignHistoryPanel({
  campaignId,
  currentAmount,
  targetAmount,
  history,
}: {
  campaignId: string;
  currentAmount: number;
  targetAmount: number;
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<"tambah" | "kurang">("tambah");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const percentage = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }
    if (!note.trim()) {
      setError("Catatan wajib diisi — biar jelas alasan penyesuaiannya di riwayat.");
      return;
    }

    setIsSubmitting(true);
    const signedAmount = direction === "tambah" ? value : -value;
    const response = await fetch(`/api/lazsip/campaigns/${campaignId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: signedAmount, note: note.trim() }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan penyesuaian.");
      return;
    }

    setAmount("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={panelClasses("p-5 sm:p-6")}>
        <h3 className="text-sm font-semibold text-lazsip-primary-900 dark:text-white">Saldo Campaign</h3>
        <p className="mt-2 break-words text-xl font-extrabold leading-tight text-lazsip-primary-900 dark:text-white sm:text-2xl md:text-3xl">
          {formatRupiah(currentAmount)}
        </p>
        <p className="mt-1 break-words text-xs text-lazsip-primary-800/50 dark:text-white/45">
          dari target {formatRupiah(targetAmount)} ({percentage}%)
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-lazsip-primary-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-lazsip-primary-700 dark:bg-lazsip-primary-400" style={{ width: `${percentage}%` }} />
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 border-t border-lazsip-primary-100 dark:border-white/10 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/50 dark:text-white/40">
            Sesuaikan Saldo Manual
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirection("tambah")}
              className={cn(
                "min-w-[7rem] flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                direction === "tambah"
                  ? "bg-lazsip-secondary-500 text-white"
                  : "bg-lazsip-primary-50/70 text-lazsip-primary-800/70 dark:bg-white/5 dark:text-white/55"
              )}
            >
              + Tambah
            </button>
            <button
              type="button"
              onClick={() => setDirection("kurang")}
              className={cn(
                "min-w-[7rem] flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                direction === "kurang"
                  ? "bg-red-600 text-white"
                  : "bg-lazsip-primary-50/70 text-lazsip-primary-800/70 dark:bg-white/5 dark:text-white/55"
              )}
            >
              − Kurangi
            </button>
          </div>
          <input
            type="number"
            min={1}
            placeholder="Nominal (Rp)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 w-full min-w-0 rounded-full bg-lazsip-primary-50/70 dark:bg-white/5 px-4 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
          />
          <input
            placeholder="Catatan (mis. donasi tunai dari Bpk. X)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-10 w-full min-w-0 rounded-full bg-lazsip-primary-50/70 dark:bg-white/5 px-4 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
          />
          {error && <p className="break-words text-xs text-red-600">{error}</p>}
          <LoadingButton type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            Simpan Penyesuaian
          </LoadingButton>
        </form>
      </div>

      <div className={panelClasses("p-5 sm:p-6")}>
        <h3 className="text-sm font-semibold text-lazsip-primary-900 dark:text-white">Riwayat</h3>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-lazsip-primary-800/50 dark:text-white/45">Belum ada riwayat donasi atau penyesuaian.</p>
        ) : (
          <ul className="mt-3 divide-y divide-lazsip-primary-50 dark:divide-white/10">
            {history.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-3 text-sm">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="break-words font-medium text-lazsip-primary-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-lazsip-primary-800/50 dark:text-white/40">
                    {item.kind === "donasi" ? "Donasi masuk" : "Penyesuaian admin"} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 break-words text-right font-semibold",
                    item.amount < 0 ? "text-red-600" : "text-lazsip-secondary-700 dark:text-lazsip-secondary-300"
                  )}
                >
                  {item.amount < 0 ? "-" : "+"}
                  {formatRupiah(Math.abs(item.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
