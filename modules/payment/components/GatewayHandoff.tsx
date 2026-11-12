"use client";

import { useEffect, useRef, useState } from "react";
import { openGatewayCheckout } from "@/modules/payment/api/openGatewayCheckout";

export function GatewayHandoff({ transactionId }: { transactionId: string }) {
  const started = useRef(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try { window.location.assign(await openGatewayCheckout(transactionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Pembayaran belum dapat dibuka."); }
    finally { busy.current = false; }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void open();
    // One handoff per created transaction, including React Strict Mode effect replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);
  return <section id="form" className="scroll-mt-28 rounded-3xl bg-white p-6 text-lazsip-primary-900 sm:p-8" aria-live="polite">
    <div className="flex items-center gap-3">
      {!error && <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-lazsip-primary-200 border-t-lazsip-primary-900 motion-reduce:animate-none" />}
      <h2 className="text-lg font-bold">{error ? "Lanjutkan pembayaran Anda" : "Membuka pembayaran iPaymu…"}</h2>
    </div>
    <p className="mt-3 text-sm leading-relaxed">Transaksi sudah tercatat. Pilih metode dan selesaikan pembayaran di iPaymu. Anda tidak perlu mengisi data lagi.</p>
    {error && <>
      <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>
      <button type="button" onClick={open} className="mt-5 w-full rounded-full bg-lazsip-primary-900 px-5 py-3 font-semibold text-white hover:bg-lazsip-primary-800">Coba buka iPaymu lagi</button>
    </>}
    <a href={`/payment/checkout/${encodeURIComponent(transactionId)}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Lihat status transaksi</a>
  </section>;
}
