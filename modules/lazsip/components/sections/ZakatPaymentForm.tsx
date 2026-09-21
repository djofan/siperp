"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatRupiah } from "@/modules/lazsip/components/format";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";

interface FeeRef {
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

export function ZakatPaymentForm({
  feeRefs,
  initialType,
  initialAmount,
}: {
  feeRefs: FeeRef[];
  initialType?: string;
  initialAmount?: string;
}) {
  // Jenis zakat (maal/fitrah) ditentukan di kalkulator sebelum sampai sini, bukan dipilih
  // ulang di form ini — kalau datang langsung dari tombol Navbar/Footer, default "maal".
  const zakatType = initialType === "fitrah" ? "fitrah" : "maal";

  const [nominal, setNominal] = useState(initialAmount ?? "");
  const [paymentMethod, setPaymentMethod] = useState(feeRefs[0]?.method ?? "");
  const [coversFee, setCoversFee] = useState(true);
  const [anonim, setAnonim] = useState(false);
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [transactionCode, setTransactionCode] = useState<string | null>(null);

  const nominalNumber = Number(nominal.replace(/[^0-9]/g, "")) || 0;
  const method = feeRefs.find((m) => m.method === paymentMethod) ?? null;

  const { fee, total } = useMemo(() => {
    const feeAmount = calculateFee(method, nominalNumber);
    return { fee: feeAmount, total: nominalNumber + (coversFee ? feeAmount : 0) };
  }, [nominalNumber, method, coversFee]);

  function handleNominalChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNominal(e.target.value.replace(/[^0-9]/g, ""));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (nominalNumber <= 0) {
      setError("Isi nominal zakat yang ingin dibayar terlebih dahulu.");
      return;
    }
    if (!paymentMethod) {
      setError("Metode pembayaran wajib dipilih.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/lazsip/zakat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorName: nama,
        zakatType,
        amount: nominalNumber,
        coversFee,
        isAnonymous: anonim,
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

  if (submitted) {
    return (
      <div
        id="form"
        className="scroll-mt-28 flex flex-col gap-3 rounded-3xl border border-lazsip-primary-100 bg-white p-6 sm:p-8"
      >
        <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900">Terima kasih!</h2>
        <p className="text-sm leading-relaxed text-lazsip-primary-800/70">
          Pembayaran zakat tercatat dan menunggu konfirmasi. Zakat disalurkan lewat rekening khusus zakat, terpisah
          dari donasi/infaq.
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
    );
  }

  return (
    <form
      id="form"
      onSubmit={handleSubmit}
      className="scroll-mt-28 flex flex-col gap-6 rounded-3xl border border-lazsip-primary-100 bg-white p-6 sm:p-8"
    >
      <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900">Form Pembayaran Zakat</h2>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="zakat-nominal" className="text-sm font-medium text-lazsip-primary-900">
          Nominal zakat (bisa disesuaikan)
        </label>
        <div className="flex items-center rounded-full border border-lazsip-primary-200 bg-white px-5 py-3.5 focus-within:ring-2 focus-within:ring-lazsip-primary-400">
          <span className="mr-2 text-lazsip-primary-500">Rp</span>
          <input
            id="zakat-nominal"
            inputMode="numeric"
            value={nominal ? nominalNumber.toLocaleString("id-ID") : ""}
            onChange={handleNominalChange}
            placeholder="0"
            className="w-full bg-transparent text-lg font-medium text-lazsip-primary-900 outline-none"
          />
        </div>
        <p className="text-xs text-lazsip-primary-800/50">
          Belum tahu nominal zakat Anda? Pakai{" "}
          <a href="/lazsip#kalkulator-zakat" className="font-semibold text-lazsip-primary-700 underline underline-offset-2">
            kalkulator zakat
          </a>{" "}
          di beranda.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium text-lazsip-primary-900">Metode pembayaran</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {feeRefs.length === 0 && <p className="col-span-2 text-xs text-lazsip-primary-800/50">Belum ada metode pembayaran.</p>}
          {feeRefs.map((ref) => (
            <button
              key={ref.method}
              type="button"
              onClick={() => setPaymentMethod(ref.method)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                paymentMethod === ref.method
                  ? "border-lazsip-primary-900 bg-lazsip-primary-50"
                  : "border-lazsip-primary-200 bg-white hover:border-lazsip-primary-400"
              }`}
            >
              <span className="block font-semibold text-lazsip-primary-900">{ref.method}</span>
              {paymentMethod === ref.method && (
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
          Tambahkan {formatRupiah(fee)} untuk biaya transaksi agar zakat tersalurkan 100%.
        </span>
      </label>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="zakat-nama" className="text-sm font-medium text-lazsip-primary-900">
            Nama
          </label>
          <input
            id="zakat-nama"
            disabled={anonim}
            value={anonim ? "Hamba Allah" : nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama Anda"
            className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 disabled:bg-lazsip-primary-50 disabled:text-lazsip-primary-800/50"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="zakat-kontak" className="text-sm font-medium text-lazsip-primary-900">
            Nomor WhatsApp
          </label>
          <input
            id="zakat-kontak"
            inputMode="numeric"
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
        <span className="text-sm text-lazsip-primary-800/80">Sembunyikan nama saya (zakat sebagai Hamba Allah)</span>
      </label>

      <div className="flex flex-col gap-2 border-t border-lazsip-primary-100 pt-4 text-sm">
        <div className="flex items-center justify-between text-lazsip-primary-800/70">
          <span>Nominal zakat</span>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || nominalNumber <= 0}
        className="inline-flex items-center justify-center rounded-full bg-lazsip-primary-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : `Bayar Zakat ${nominalNumber > 0 ? formatRupiah(total) : "Sekarang"}`}
      </button>
    </form>
  );
}
