"use client";

import { useMemo, useState } from "react";
import { formatRupiah } from "@/components/lazsip/format";

const NISAB_GRAM = 85;
const ZAKAT_RATE = 0.025;

const toNumber = (v: string) => Number(v) || 0;
const parseDigits = (raw: string) => raw.replace(/[^0-9]/g, "");

export function HeroZakatCalculator({ goldPricePerGram }: { goldPricePerGram: number }) {
  const [harta, setHarta] = useState("");

  const nisabValue = goldPricePerGram * NISAB_GRAM;

  // Dihitung langsung tiap ketikan (bukan nunggu tombol) — harga emas sudah diambil
  // sekali dari server, jadi tidak perlu roundtrip API per keystroke.
  const result = useMemo(() => {
    const hartaAmount = toNumber(harta);
    const isWajibZakat = hartaAmount > 0 && hartaAmount >= nisabValue;
    const zakatAmount = isWajibZakat ? Math.round(hartaAmount * ZAKAT_RATE) : 0;
    return { hartaAmount, isWajibZakat, zakatAmount };
  }, [harta, nisabValue]);

  const payHref = result.zakatAmount > 0 ? `/lazsip/zakat?harta=${result.hartaAmount}` : "#kalkulator-zakat";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-lazsip-primary-800/50">Kalkulator Zakat Maal</p>

      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="hero-zk-harta" className="text-xs font-medium text-lazsip-primary-800/70">
          Total harta
        </label>
        <div className="flex items-center rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 focus-within:ring-2 focus-within:ring-lazsip-primary-400">
          <span className="mr-2 shrink-0 text-sm text-lazsip-primary-500">Rp</span>
          <input
            id="hero-zk-harta"
            inputMode="numeric"
            placeholder="0"
            value={harta ? toNumber(harta).toLocaleString("id-ID") : ""}
            onChange={(e) => setHarta(parseDigits(e.target.value))}
            className="w-full bg-transparent text-sm font-medium text-lazsip-primary-900 outline-none"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-lazsip-primary-900 px-4 py-3">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              result.isWajibZakat ? "bg-lazsip-secondary-500/25 text-lazsip-secondary-100" : "bg-white/10 text-white/60"
            }`}
          >
            {result.hartaAmount === 0 ? "Menunggu input" : result.isWajibZakat ? "Wajib Zakat" : "Belum Wajib"}
          </span>
          <p className="mt-1 truncate text-lg font-extrabold text-white">{formatRupiah(result.zakatAmount)}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/50">
            {result.hartaAmount === 0
              ? `Nisab setara ${NISAB_GRAM} gram emas (${formatRupiah(nisabValue)}).`
              : result.isWajibZakat
                ? "Harta Anda sudah mencapai nishab."
                : "Harta Anda belum mencapai nishab."}
          </p>
        </div>
      </div>

      <a
        href={payHref}
        aria-disabled={result.zakatAmount === 0}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
          result.zakatAmount > 0
            ? "bg-lazsip-primary-900 text-white hover:bg-lazsip-primary-800"
            : "cursor-not-allowed bg-lazsip-primary-900/10 text-lazsip-primary-900/40"
        }`}
      >
        Bayar Zakat Sekarang
      </a>
    </div>
  );
}
