"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/modules/lazsip/components/format";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";
import { normalizeDonorPhone } from "@/modules/payment/api/donorIdentity";

const QUICK_NOMINAL = [50_000, 100_000, 250_000, 500_000, 1_000_000];

interface FeeRef {
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

export function DonationForm({ campaignId, feeRefs }: { campaignId: string; feeRefs: FeeRef[] }) {
  const router = useRouter();
  const [nominal, setNominal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(feeRefs[0]?.method ?? "");
  const [coversFee, setCoversFee] = useState(true);
  const [anonim, setAnonim] = useState(false);
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nominalNumber = Number(nominal.replace(/[^0-9]/g, "")) || 0;
  const method = feeRefs.find((m) => m.method === paymentMethod) ?? null;

  const { fee, total } = useMemo(() => {
    const feeAmount = calculateFee(method, nominalNumber);
    return { fee: feeAmount, total: nominalNumber + (coversFee ? feeAmount : 0) };
  }, [nominalNumber, method, coversFee]);

  function handleNominalChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNominal(e.target.value.replace(/[^0-9]/g, ""));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (nominalNumber <= 0 || !method) {
      setError(!method ? "Metode pembayaran belum tersedia. Silakan hubungi pengelola." : "Masukkan nominal donasi terlebih dahulu.");
      return;
    }
    if (!nama.trim() || !normalizeDonorPhone(kontak)) {
      setError("Nama dan nomor WhatsApp yang valid wajib diisi, termasuk untuk donasi anonim.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSource: "lazsip",
          sourceType: "campaign",
          sourceId: campaignId,
          fundType: "infak",
          donorName: nama.trim(),
          donorPhone: kontak,
          isAnonymous: anonim,
          amount: nominalNumber,
          coversFee,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Gagal mengirim donasi.");
        return;
      }

      const data = await response.json();
      if (typeof data.transactionId !== "string" || !data.transactionId) {
        throw new Error("Respons checkout tidak valid.");
      }
      router.push(`/payment/checkout/${data.transactionId}`);
    } catch {
      setError("Gagal membuka pembayaran. Periksa koneksi lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="form"
      onSubmit={handleSubmit}
      className="scroll-mt-28 flex flex-col gap-6 rounded-3xl border border-lazsip-primary-100 bg-white p-6 sm:p-8"
    >
      <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900">Form Donasi</h2>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium text-lazsip-primary-900">Nominal donasi</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_NOMINAL.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNominal(String(n))}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                nominalNumber === n
                  ? "border-lazsip-primary-900 bg-lazsip-primary-900 text-white"
                  : "border-lazsip-primary-200 bg-white text-lazsip-primary-800 hover:border-lazsip-primary-400"
              }`}
            >
              {formatRupiah(n)}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-full border border-lazsip-primary-200 bg-white px-5 py-3 focus-within:ring-2 focus-within:ring-lazsip-primary-400">
          <span className="mr-2 text-lazsip-primary-500">Rp</span>
          <input
            inputMode="numeric"
            placeholder="Nominal lainnya"
            value={nominal ? Number(nominal).toLocaleString("id-ID") : ""}
            onChange={handleNominalChange}
            className="w-full bg-transparent text-base font-medium text-lazsip-primary-900 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium text-lazsip-primary-900">Metode pembayaran</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {feeRefs.length === 0 && <p role="status" className="sm:col-span-2 text-sm text-lazsip-primary-800/70">Metode pembayaran belum tersedia. Silakan hubungi pengelola untuk mengaktifkannya.</p>}
          {feeRefs.map((m) => (
            <button
              key={m.method}
              type="button"
              onClick={() => setPaymentMethod(m.method)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                paymentMethod === m.method ? "border-lazsip-primary-900 bg-lazsip-primary-50" : "border-lazsip-primary-200 bg-white hover:border-lazsip-primary-400"
              }`}
            >
              <span className="block font-semibold text-lazsip-primary-900">{m.method}</span>
              {paymentMethod === m.method && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-lazsip-primary-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-4">
        <input
          type="checkbox"
          checked={coversFee}
          onChange={(e) => setCoversFee(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-lazsip-primary-300 text-lazsip-primary-700 focus:ring-lazsip-primary-400"
        />
        <span className="text-sm text-lazsip-primary-800/80">
          Tambahkan {formatRupiah(fee)} untuk biaya transaksi agar donasi tersalurkan 100%.
        </span>
      </label>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="donasi-nama" className="text-sm font-medium text-lazsip-primary-900">Nama</label>
          <input
            id="donasi-nama"
            required
            maxLength={191}
            autoComplete="name"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama Anda"
            className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 disabled:bg-lazsip-primary-50 disabled:text-lazsip-primary-800/50"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="donasi-kontak" className="text-sm font-medium text-lazsip-primary-900">Nomor WhatsApp</label>
          <input
            id="donasi-kontak"
            required
            type="tel"
            autoComplete="tel"
            maxLength={25}
            value={kontak}
            onChange={(e) => setKontak(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
          />
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={anonim}
          onChange={(e) => setAnonim(e.target.checked)}
          className="h-4 w-4 rounded border-lazsip-primary-300 text-lazsip-primary-700 focus:ring-lazsip-primary-400"
        />
        <span className="text-sm text-lazsip-primary-800/80">Sembunyikan nama saya di daftar donatur publik (Hamba Allah). Nama asli dan nomor WhatsApp tetap dicatat dan hanya dapat dilihat admin.</span>
      </label>

      <div className="flex flex-col gap-2 border-t border-lazsip-primary-100 pt-4 text-sm">
        <div className="flex items-center justify-between text-lazsip-primary-800/70">
          <span>Nominal donasi</span>
          <span className="font-medium text-lazsip-primary-900">{formatRupiah(nominalNumber)}</span>
        </div>
        <div className="flex items-center justify-between text-lazsip-primary-800/70">
          <span>Biaya admin</span>
          <span className="font-medium text-lazsip-primary-900">{coversFee ? formatRupiah(fee) : "Ditanggung LAZSIP"}</span>
        </div>
        <div className="flex items-center justify-between border-t border-lazsip-primary-100 pt-2 text-base font-bold text-lazsip-primary-900">
          <span>Total pembayaran</span>
          <span>{formatRupiah(total)}</span>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || nominalNumber <= 0 || !method}
        className="inline-flex items-center justify-center rounded-full bg-lazsip-primary-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Memproses..." : `Donasi ${nominalNumber > 0 ? formatRupiah(total) : "Sekarang"}`}
      </button>
    </form>
  );
}
