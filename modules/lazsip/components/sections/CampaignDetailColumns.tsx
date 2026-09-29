"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { formatRupiah, formatDate } from "@/modules/lazsip/components/format";
import { DonationForm } from "@/modules/lazsip/components/sections/DonationForm";
import type { CampaignHistoryEntry } from "@/modules/lazsip/api/campaigns";

interface FeeRef {
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}

// Tinggi list riwayat sebelum JS sempat mengukur (SSR/first paint) — dilewati cepat oleh
// useLayoutEffect sebelum browser sempat menggambar, jadi gak kelihatan "loncat".
const FALLBACK_HISTORY_HEIGHT = 208;
const MIN_HISTORY_HEIGHT = 64;

/**
 * Bagian ATAS kolom kiri (artikel) & kanan (form) otomatis sejajar lewat CSS Grid (sama-sama
 * grid item, item.align default "start"). Yang perlu disamakan manual cuma BAWAHNYA: tinggi
 * list Riwayat Dana disesuaikan supaya tinggi total artikel = tinggi form — diukur sekali per
 * perubahan lewat formRef (bukan self-observe artikel, itu penyebab loop/nilai meleset di
 * percobaan sebelumnya).
 */
export function CampaignDetailColumns({
  articleTop,
  history,
  campaignId,
  uniqueCode,
  feeRefs,
  isActive,
}: {
  articleTop: ReactNode;
  history: CampaignHistoryEntry[];
  campaignId: string;
  uniqueCode: string;
  feeRefs: FeeRef[];
  isActive: boolean;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const formColumnRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(FALLBACK_HISTORY_HEIGHT);

  useLayoutEffect(() => {
    if (history.length === 0) return;

    function recompute() {
      const articleEl = articleRef.current;
      const listEl = listRef.current;
      const formEl = formColumnRef.current;
      if (!articleEl || !listEl || !formEl) return;

      if (!window.matchMedia("(min-width: 1024px)").matches) {
        setMaxHeight(FALLBACK_HISTORY_HEIGHT);
        return;
      }

      // Tinggi semua isi artikel SELAIN list (invarian terhadap max-height list saat ini,
      // karena elemen lain di atas/bawahnya gak ikut berubah tinggi kalau list berubah).
      const articleRestHeight = articleEl.getBoundingClientRect().height - listEl.getBoundingClientRect().height;
      const formHeight = formEl.getBoundingClientRect().height;
      const listNaturalHeight = listEl.scrollHeight;
      const target = formHeight - articleRestHeight;
      setMaxHeight(Math.round(Math.min(Math.max(target, MIN_HISTORY_HEIGHT), listNaturalHeight)));
    }

    recompute();
    // Cuma observe form (bukan artikel sendiri) — kalau ikut observe artikel, perubahan
    // max-height yang KITA set sendiri bakal memicu observer lagi (loop, gak presisi).
    const observer = new ResizeObserver(recompute);
    if (formColumnRef.current) observer.observe(formColumnRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <article ref={articleRef} className="order-2 lg:order-1">
        {articleTop}

        <section className="mt-10 rounded-2xl border border-lazsip-primary-100 bg-white p-6" aria-labelledby="campaign-history">
          <h2 id="campaign-history" className="text-xl font-bold text-lazsip-primary-900">Riwayat Dana</h2>
          <p className="mt-1 text-sm text-lazsip-primary-800/60">
            Transparansi donasi yang masuk dan dana yang sudah disalurkan dari campaign ini.
          </p>
          {history.length ? (
            <ul
              ref={listRef}
              className="lazsip-scrollbar-hide mt-4 flex flex-col divide-y divide-lazsip-primary-100 overflow-y-auto"
              style={{ maxHeight }}
            >
              {history.map((item) => {
                const isOutflow = item.amount < 0;
                const typeLabel =
                  item.kind === "donasi" ? "Donasi masuk" : isOutflow ? "Dana disalurkan" : "Penyesuaian saldo";
                return (
                  <li key={`${item.kind}-${item.id}`} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-lazsip-primary-900">{item.label}</p>
                      <p className="mt-0.5 text-xs text-lazsip-primary-800/50">
                        {typeLabel} · {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${
                        isOutflow ? "text-red-600" : "text-lazsip-secondary-700"
                      }`}
                    >
                      {isOutflow ? "-" : "+"}
                      {formatRupiah(Math.abs(item.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-3 text-sm text-lazsip-primary-800/70">Belum ada donasi yang terkonfirmasi.</p>}
        </section>
      </article>

      <div ref={formColumnRef} className="order-1 lg:order-2">
        {isActive ? (
          <DonationForm campaignId={campaignId} uniqueCode={uniqueCode} feeRefs={feeRefs} />
        ) : (
          <p className="rounded-3xl border border-lazsip-primary-100 bg-white p-6 text-sm font-medium text-lazsip-primary-800/60">
            Campaign ini sudah selesai. Terima kasih atas dukungannya!
          </p>
        )}
      </div>
    </div>
  );
}
