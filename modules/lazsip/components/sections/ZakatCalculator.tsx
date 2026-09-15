"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatRupiah } from "@/modules/lazsip/components/format";

interface FeeRef {
  method: string;
}

const NISAB_GRAM = 85;
const ZAKAT_RATE = 0.025;

const toNumber = (v: string) => Number(v) || 0;
const parseDigits = (raw: string) => raw.replace(/[^0-9]/g, "");

type ZakatType = "maal" | "fitrah";

export function ZakatCalculator({
  feeRefs,
  goldPricePerGram,
  fitrahPricePerJiwa,
  initialType,
  initialHarta,
  initialJiwa,
}: {
  feeRefs: FeeRef[];
  goldPricePerGram: number;
  fitrahPricePerJiwa: number;
  initialType?: string;
  initialHarta?: string;
  initialJiwa?: string;
}) {
  const [type, setType] = useState<ZakatType>(initialType === "fitrah" ? "fitrah" : "maal");
  const [hartaAmount, setHartaAmount] = useState(initialHarta ?? "");
  const [jiwaCount, setJiwaCount] = useState(initialJiwa ?? "");

  const [showPayForm, setShowPayForm] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(feeRefs[0]?.method ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [transactionCode, setTransactionCode] = useState<string | null>(null);

  const nisabValue = goldPricePerGram * NISAB_GRAM;

  // Dihitung langsung tiap ketikan (bukan nunggu tombol) — harga emas/harga per jiwa
  // sudah diambil sekali dari server, jadi tidak perlu roundtrip API per keystroke.
  const maal = useMemo(() => {
    const amount = toNumber(hartaAmount);
    const isWajibZakat = amount > 0 && amount >= nisabValue;
    const zakatAmount = isWajibZakat ? Math.round(amount * ZAKAT_RATE) : 0;
    return { amount, isWajibZakat, zakatAmount };
  }, [hartaAmount, nisabValue]);

  const fitrah = useMemo(() => {
    const jiwa = toNumber(jiwaCount);
    const zakatAmount = jiwa > 0 ? Math.round(jiwa * fitrahPricePerJiwa) : 0;
    return { jiwa, zakatAmount };
  }, [jiwaCount, fitrahPricePerJiwa]);

  const isMaal = type === "maal";
  const hasInput = isMaal ? maal.amount > 0 : fitrah.jiwa > 0;
  const zakatAmount = isMaal ? maal.zakatAmount : fitrah.zakatAmount;
  const canPay = isMaal ? hasInput && maal.isWajibZakat : hasInput;

  function switchType(next: ZakatType) {
    setType(next);
    setShowPayForm(false);
  }

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!paymentMethod) {
      setError("Metode pembayaran wajib dipilih.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/lazsip/zakat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorName,
        zakatType: type,
        amount: zakatAmount,
        goldPriceSnapshot: isMaal ? goldPricePerGram : undefined,
        jiwaCount: isMaal ? undefined : fitrah.jiwa,
        paymentMethod,
      }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal mengirim pembayaran zakat.");
      return;
    }

    const data = await response.json();
    setTransactionCode(data.id);
    setSubmitted(true);
  }

  return (
    <div className="flex max-w-md flex-col gap-4 rounded-3xl border border-lazsip-primary-100 bg-white p-6 sm:p-8">
      <div className="flex gap-1 rounded-full bg-lazsip-primary-50 p-1">
        <button
          type="button"
          onClick={() => switchType("maal")}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
            isMaal ? "bg-lazsip-primary-900 text-white" : "text-lazsip-primary-800/60"
          }`}
        >
          Zakat Maal
        </button>
        <button
          type="button"
          onClick={() => switchType("fitrah")}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
            !isMaal ? "bg-lazsip-primary-900 text-white" : "text-lazsip-primary-800/60"
          }`}
        >
          Zakat Fitrah
        </button>
      </div>

      {isMaal ? (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-lazsip-primary-900">Total harta yang dimiliki (Rp)</label>
          <div className="flex items-center rounded-full border border-lazsip-primary-200 bg-white px-5 py-3 focus-within:ring-2 focus-within:ring-lazsip-primary-400">
            <span className="mr-2 text-lazsip-primary-500">Rp</span>
            <input
              inputMode="numeric"
              value={hartaAmount ? toNumber(hartaAmount).toLocaleString("id-ID") : ""}
              onChange={(e) => setHartaAmount(parseDigits(e.target.value))}
              className="w-full bg-transparent text-base font-medium text-lazsip-primary-900 outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-lazsip-primary-900">Jumlah jiwa yang ditanggung</label>
          <div className="flex items-center rounded-full border border-lazsip-primary-200 bg-white px-5 py-3 focus-within:ring-2 focus-within:ring-lazsip-primary-400">
            <input
              inputMode="numeric"
              value={jiwaCount ? toNumber(jiwaCount).toLocaleString("id-ID") : ""}
              onChange={(e) => setJiwaCount(parseDigits(e.target.value))}
              className="w-full bg-transparent text-base font-medium text-lazsip-primary-900 outline-none"
            />
            <span className="ml-2 shrink-0 text-sm text-lazsip-primary-500">jiwa</span>
          </div>
          <p className="text-xs text-lazsip-primary-800/50">
            Rp{fitrahPricePerJiwa.toLocaleString("id-ID")} per jiwa, setara harga makanan pokok setempat.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-lazsip-primary-100 pt-4">
        <div className="rounded-xl bg-lazsip-primary-50/60 p-3 text-sm text-lazsip-primary-900">
          {isMaal && (
            <div className="flex justify-between opacity-70">
              <span>Nisab (85gr emas)</span>
              <span>{formatRupiah(nisabValue)}</span>
            </div>
          )}
          <div className={`flex justify-between font-semibold ${isMaal ? "mt-1 border-t border-lazsip-primary-100 pt-1" : ""}`}>
            <span>
              {!hasInput
                ? "Menunggu input"
                : isMaal
                  ? maal.isWajibZakat
                    ? "Zakat wajib dibayar"
                    : "Belum wajib zakat"
                  : "Zakat fitrah dibayar"}
            </span>
            <span>{formatRupiah(zakatAmount)}</span>
          </div>
        </div>

        {canPay && !submitted && !showPayForm && (
          <button
            type="button"
            onClick={() => setShowPayForm(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lazsip-primary-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
          >
            Bayar Zakat
          </button>
        )}

        {showPayForm && !submitted && (
          <form onSubmit={handlePay} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nama (opsional)"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="h-11 rounded-full border border-lazsip-primary-200 bg-white px-5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-11 rounded-full border border-lazsip-primary-200 bg-white px-5 text-sm text-lazsip-primary-900 outline-none"
            >
              <option value="" disabled>
                Pilih metode pembayaran
              </option>
              {feeRefs.map((ref) => (
                <option key={ref.method} value={ref.method}>
                  {ref.method}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-full bg-lazsip-primary-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memproses..." : "Konfirmasi Pembayaran"}
            </button>
          </form>
        )}

        {submitted && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-lazsip-primary-800">
              Terima kasih! Pembayaran zakat tercatat dan menunggu konfirmasi. Zakat disalurkan lewat rekening
              khusus zakat, terpisah dari donasi/infaq.
            </p>
            {transactionCode && (
              <div className="rounded-2xl bg-lazsip-primary-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/50">Kode Transaksi</p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-lazsip-primary-900">{transactionCode}</p>
                <p className="mt-1.5 text-xs text-lazsip-primary-800/60">
                  Simpan kode ini untuk cek status pembayaran lewat menu &quot;Cek Status&quot; di beranda.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
