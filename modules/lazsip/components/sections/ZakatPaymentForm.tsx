"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/modules/lazsip/components/format";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";
import { normalizeDonorPhone, normalizeDonorEmail } from "@/modules/payment/api/donorIdentity";

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
  const router = useRouter();

  // Jenis zakat (maal/fitrah) ditentukan di kalkulator sebelum sampai sini, bukan dipilih
  // ulang di form ini — kalau datang langsung dari tombol Navbar/Footer, default "maal".
  const zakatType = initialType === "fitrah" ? "fitrah" : "maal";

  const [nominal, setNominal] = useState(initialAmount ?? "");
  const [paymentMethod, setPaymentMethod] = useState(feeRefs[0]?.method ?? "");
  const [coversFee, setCoversFee] = useState(true);
  const [anonim, setAnonim] = useState(false);
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (nominalNumber <= 0 || !method) {
      setError(!method ? "Metode pembayaran belum tersedia. Silakan hubungi pengelola." : "Isi nominal zakat yang ingin dibayar terlebih dahulu.");
      return;
    }
    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    const phoneValid = kontak.trim() ? normalizeDonorPhone(kontak) : null;
    const emailValid = email.trim() ? normalizeDonorEmail(email) : null;
    if (kontak.trim() && !phoneValid) {
      setError("Nomor WhatsApp tidak valid.");
      return;
    }
    if (email.trim() && !emailValid) {
      setError("Alamat email tidak valid.");
      return;
    }
    if (!phoneValid && !emailValid) {
      setError("Isi minimal salah satu: nomor WhatsApp atau email.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSource: "lazsip",
          sourceType: "zakat",
          fundType: "zakat",
          zakatType,
          donorName: nama.trim(),
          donorPhone: kontak,
          donorEmail: email.trim(),
          isAnonymous: anonim,
          amount: nominalNumber,
          coversFee,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Gagal mengirim pembayaran zakat.");
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
      setIsSubmitting(false);
    }
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
          {feeRefs.length === 0 && <p role="status" className="col-span-2 text-sm text-lazsip-primary-800/70">Metode pembayaran belum tersedia. Silakan hubungi pengelola untuk mengaktifkannya.</p>}
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
          <label htmlFor="zakat-kontak" className="text-sm font-medium text-lazsip-primary-900">
            Nomor WhatsApp
          </label>
          <input
            id="zakat-kontak"
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="zakat-email" className="text-sm font-medium text-lazsip-primary-900">Email</label>
        <input
          id="zakat-email"
          type="email"
          autoComplete="email"
          maxLength={191}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
        />
        <p className="text-xs text-lazsip-primary-800/50">Isi minimal salah satu: WhatsApp atau email. Email dipakai kirim kode pelacakan &amp; bisa dipakai cek riwayat zakat kapan saja.</p>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={anonim}
          onChange={(e) => setAnonim(e.target.checked)}
          className="h-4 w-4 rounded border-lazsip-primary-300 text-lazsip-primary-700 focus:ring-lazsip-primary-400"
        />
        <span className="text-sm text-lazsip-primary-800/80">Sembunyikan nama saya di daftar publik (Hamba Allah). Nama asli, nomor WhatsApp, dan email tetap dicatat dan hanya dapat dilihat admin.</span>
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

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || nominalNumber <= 0 || !method}
        className="inline-flex items-center justify-center rounded-full bg-lazsip-primary-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : `Bayar Zakat ${nominalNumber > 0 ? formatRupiah(total) : "Sekarang"}`}
      </button>
    </form>
  );
}
