"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatRupiah, formatDateTime } from "@/modules/lazsip/components/format";

interface StatusResult {
  found: boolean;
  code?: string;
  type?: "donasi" | "zakat";
  label?: string;
  amount?: number;
  adminFee?: number;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
  checkoutId?: string;
  gateway?: string;
}

interface StatusMeta {
  label: string;
  amountLabel: string;
  headerBg: string;
  iconBg: string;
  iconColor: string;
  note?: string;
  noteClass?: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  paid: {
    label: "Success",
    amountLabel: "Total Dibayarkan",
    headerBg: "bg-lazsip-secondary-50",
    iconBg: "bg-lazsip-secondary-100",
    iconColor: "text-lazsip-secondary-600",
  },
  pending: {
    label: "Pending",
    amountLabel: "Total Tagihan",
    headerBg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    note: "Segera selesaikan pembayaran lewat metode yang Anda pilih. Kode transaksi ini bisa dicek ulang kapan saja untuk lihat status terbaru.",
    noteClass: "bg-amber-50 text-amber-800",
  },
  failed: {
    label: "Failed",
    amountLabel: "Nominal Transaksi",
    headerBg: "bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    note: "Transaksi ini tidak berhasil. Silakan lakukan donasi atau pembayaran zakat kembali dari awal.",
    noteClass: "bg-red-50 text-red-700",
  },
};

const FALLBACK_META: StatusMeta = {
  label: "Status Tidak Diketahui",
  amountLabel: "Nominal Transaksi",
  headerBg: "bg-lazsip-primary-50",
  iconBg: "bg-lazsip-primary-100",
  iconColor: "text-lazsip-primary-600",
};

const MODAL_TRANSITION_MS = 200;

function StatusIcon({ status, className }: { status?: string; className?: string }) {
  if (status === "paid") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 7" />
      </svg>
    );
  }
  if (status === "pending") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function HeroCekStatus() {
  const [kode, setKode] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modal di-mount dulu dalam keadaan tak-kelihatan (opacity/scale 0), baru
  // di-flip ke kelihatan di frame berikutnya — biar transisinya beneran ke-trigger
  // (mount + kelas animasi barengan gak akan dianimasikan oleh browser).
  useEffect(() => {
    if (!showModal) return;
    const raf = requestAnimationFrame(() => setIsModalVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [showModal]);

  function closeModal() {
    setIsModalVisible(false);
    setTimeout(() => setShowModal(false), MODAL_TRANSITION_MS);
  }

  useEffect(() => {
    if (!showModal) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector('[aria-label="Status transaksi"]');
    const buttons = dialog?.querySelectorAll<HTMLElement>("button, a[href]");
    buttons?.[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalVisible(false);
        setShowModal(false);
      }
      if (event.key === "Tab" && buttons?.length) {
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [showModal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = kode.trim();
    if (!trimmed) return;

    setIsPending(true);
    setCopied(false);
    const response = await fetch("/api/lazsip/transactions/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
    const data = await response.json();
    setResult(data);
    setShowModal(true);
    setIsPending(false);
  }

  async function handleCopyCode() {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API bisa gagal di browser lama/tanpa izin — abaikan saja, kode tetap terbaca di layar.
    }
  }

  const meta = result?.status ? (STATUS_META[result.status] ?? FALLBACK_META) : FALLBACK_META;

  return (
    <>
      <p className="text-sm leading-relaxed text-lazsip-primary-800/80">
        Sudah bayar? Masukkan kode transaksi yang tampil setelah donasi/zakat untuk cek status terkini.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="Masukkan kode transaksi"
          className="rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
        />
        <button
          type="submit"
          disabled={isPending || !kode.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Memeriksa..." : "Cek Status"}
        </button>
      </form>

      <ul className="mt-5 flex flex-col gap-2.5 border-t border-lazsip-primary-100 pt-4 text-xs leading-relaxed text-lazsip-primary-800/80">
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Kode transaksi (format LZS-XXXXXX) muncul di layar begitu Anda selesai donasi/bayar zakat.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Kode yang sama juga dikirim ke email Anda kalau diisi saat transaksi.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Bisa dicek kapan saja, tanpa perlu login.
        </li>
      </ul>

      {showModal && result && createPortal(
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-opacity duration-200 ${
            isModalVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Status transaksi"
            className={`relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-white text-left shadow-xl transition-all duration-200 ${
              isModalVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Tutup"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-lazsip-primary-800/80 transition-colors hover:bg-white hover:text-lazsip-primary-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {result.found && result.status ? (
              <>
                <div className={`px-6 pb-6 pt-8 text-center ${meta.headerBg}`}>
                  <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${meta.iconBg} ${meta.iconColor}`}>
                    <StatusIcon status={result.status} className="h-7 w-7" />
                  </span>
                  <p className="mt-3 text-base font-bold text-lazsip-primary-900">{meta.label}</p>
                  {result.code && (
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-lazsip-primary-800/70 transition-colors hover:bg-white hover:text-lazsip-primary-900"
                    >
                      {result.code}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                        {copied ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 7" />
                        ) : (
                          <>
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15V6a2 2 0 0 1 2-2h9" />
                          </>
                        )}
                      </svg>
                      {copied && <span>Tersalin</span>}
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <div className="rounded-2xl bg-lazsip-primary-50/60 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/75">{meta.amountLabel}</p>
                    <p className="mt-1 text-2xl font-extrabold text-lazsip-primary-900">{formatRupiah(result.amount ?? 0)}</p>
                  </div>

                  <div className="my-5 border-t border-dashed border-lazsip-primary-200" />

                  <dl className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-lazsip-primary-800/80">{result.type === "donasi" ? "Campaign" : "Jenis"}</dt>
                      <dd className="text-right font-semibold text-lazsip-primary-900">{result.label}</dd>
                    </div>
                    {!!result.adminFee && (
                      <div className="flex items-center justify-between">
                        <dt className="text-lazsip-primary-800/80">Biaya Admin</dt>
                        <dd className="font-semibold text-lazsip-primary-900">{formatRupiah(result.adminFee)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-lazsip-primary-800/80">Metode Pembayaran</dt>
                      <dd className="font-semibold text-lazsip-primary-900">{result.paymentMethod}</dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-lazsip-primary-100 pt-2.5">
                      <dt className="text-lazsip-primary-800/80">Tanggal &amp; Waktu</dt>
                      <dd className="text-right font-semibold text-lazsip-primary-900">
                        {result.createdAt ? formatDateTime(new Date(result.createdAt)) : "-"}
                      </dd>
                    </div>
                  </dl>

                  {meta.note && (
                    <div className={`mt-5 rounded-xl p-3 text-xs leading-relaxed ${meta.noteClass}`}>{meta.note}</div>
                  )}

                  {result.status === "pending" && result.checkoutId && (
                    <a
                      href={`/payment/checkout/${result.checkoutId}`}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
                    >
                      Lanjutkan Pembayaran (Lihat Kode VA/QRIS)
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-6 w-full rounded-full border border-lazsip-primary-200 px-4 py-2.5 text-sm font-semibold text-lazsip-primary-800 transition-colors hover:border-lazsip-primary-400"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <div className="p-7 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
                <p className="mt-3 text-sm font-bold text-lazsip-primary-900">Kode Tidak Ditemukan</p>
                <p className="mt-1.5 text-sm leading-relaxed text-lazsip-primary-800/80">
                  Periksa kembali kode transaksi Anda, atau hubungi CS kami kalau masih bermasalah.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-6 w-full rounded-full border border-lazsip-primary-200 px-4 py-2.5 text-sm font-semibold text-lazsip-primary-800 transition-colors hover:border-lazsip-primary-400"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>, document.body
      )}
    </>
  );
}
