"use client";

import { useMemo, useState } from "react";
import { formatRupiah } from "@/modules/lazsip/components/format";

const NISAB_GRAM = 85;
const ZAKAT_RATE = 0.025;

const toNumber = (v: string) => Number(v) || 0;
const parseDigits = (raw: string) => raw.replace(/[^0-9]/g, "");

type ZakatType = "maal" | "fitrah";

export function HeroZakatCalculator({
  goldPricePerGram,
  fitrahPricePerJiwa,
}: {
  goldPricePerGram: number;
  fitrahPricePerJiwa: number;
}) {
  const [type, setType] = useState<ZakatType>("maal");
  const [harta, setHarta] = useState("");
  const [jiwa, setJiwa] = useState("");

  const nisabValue = goldPricePerGram * NISAB_GRAM;

  // Dihitung langsung tiap ketikan (bukan nunggu tombol) — harga emas/harga per jiwa
  // sudah diambil sekali dari server, jadi tidak perlu roundtrip API per keystroke.
  const maal = useMemo(() => {
    const hartaAmount = toNumber(harta);
    const isWajibZakat = hartaAmount > 0 && hartaAmount >= nisabValue;
    const zakatAmount = isWajibZakat ? Math.round(hartaAmount * ZAKAT_RATE) : 0;
    return { hartaAmount, isWajibZakat, zakatAmount };
  }, [harta, nisabValue]);

  const fitrah = useMemo(() => {
    const jiwaCount = toNumber(jiwa);
    const zakatAmount = jiwaCount > 0 ? Math.round(jiwaCount * fitrahPricePerJiwa) : 0;
    return { jiwaCount, zakatAmount };
  }, [jiwa, fitrahPricePerJiwa]);

  const isMaal = type === "maal";
  const zakatAmount = isMaal ? maal.zakatAmount : fitrah.zakatAmount;
  const hasInput = isMaal ? maal.hartaAmount > 0 : fitrah.jiwaCount > 0;

  const payHref =
    zakatAmount > 0 ? `/lazsip/zakat?type=${type}&amount=${zakatAmount}` : "#kalkulator-zakat";

  return (
    <div>
      <div className="flex gap-1 rounded-full bg-lazsip-primary-50 p-1">
        <button
          type="button"
          onClick={() => setType("maal")}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-colors ${
            isMaal ? "bg-lazsip-primary-900 text-white" : "text-lazsip-primary-800/60"
          }`}
        >
          Zakat Maal
        </button>
        <button
          type="button"
          onClick={() => setType("fitrah")}
          className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-colors ${
            !isMaal ? "bg-lazsip-primary-900 text-white" : "text-lazsip-primary-800/60"
          }`}
        >
          Zakat Fitrah
        </button>
      </div>

      {isMaal ? (
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
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="hero-zk-jiwa" className="text-xs font-medium text-lazsip-primary-800/70">
            Jumlah jiwa
          </label>
          <div className="flex items-center rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 focus-within:ring-2 focus-within:ring-lazsip-primary-400">
            <input
              id="hero-zk-jiwa"
              inputMode="numeric"
              placeholder="0"
              value={jiwa ? toNumber(jiwa).toLocaleString("id-ID") : ""}
              onChange={(e) => setJiwa(parseDigits(e.target.value))}
              className="w-full bg-transparent text-sm font-medium text-lazsip-primary-900 outline-none"
            />
            <span className="ml-2 shrink-0 text-sm text-lazsip-primary-500">jiwa</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-lazsip-primary-900 px-4 py-3">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              isMaal
                ? maal.isWajibZakat
                  ? "bg-lazsip-secondary-500/25 text-lazsip-secondary-100"
                  : "bg-white/10 text-white/60"
                : hasInput
                  ? "bg-lazsip-secondary-500/25 text-lazsip-secondary-100"
                  : "bg-white/10 text-white/60"
            }`}
          >
            {!hasInput ? "Menunggu input" : isMaal ? (maal.isWajibZakat ? "Wajib Zakat" : "Belum Wajib") : "Siap Dibayar"}
          </span>
          <p className="mt-1 truncate text-lg font-extrabold text-white">{formatRupiah(zakatAmount)}</p>
          <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-white/50">
            {isMaal
              ? !hasInput
                ? `Nisab setara ${NISAB_GRAM} gram emas (${formatRupiah(nisabValue)}).`
                : maal.isWajibZakat
                  ? "Harta Anda sudah mencapai nishab."
                  : "Harta Anda belum mencapai nishab."
              : `Rp${fitrahPricePerJiwa.toLocaleString("id-ID")} per jiwa (setara makanan pokok).`}
          </p>
        </div>
      </div>

      <a
        href={payHref}
        aria-disabled={zakatAmount === 0}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
          zakatAmount > 0
            ? "bg-lazsip-primary-900 text-white hover:bg-lazsip-primary-800"
            : "cursor-not-allowed bg-lazsip-primary-900/10 text-lazsip-primary-900/40"
        }`}
      >
        Bayar Zakat Sekarang
      </a>
    </div>
  );
}
