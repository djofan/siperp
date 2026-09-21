"use client";

import { useState } from "react";
import { HeroZakatCalculator } from "@/modules/lazsip/components/sections/HeroZakatCalculator";
import { HeroCekStatus } from "@/modules/lazsip/components/sections/HeroCekStatus";
import { HeroCekRiwayat } from "@/modules/lazsip/components/sections/HeroCekRiwayat";

type Tool = "kalkulator" | "cekStatus" | "cekRiwayat";

const TOOLS: { value: Tool; label: string; icon: string }[] = [
  {
    value: "kalkulator",
    label: "Kalkulator Zakat",
    icon: "M9 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 7h6M9 11h6M9 15h2",
  },
  {
    value: "cekStatus",
    label: "Cek Status",
    icon: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M9 12l2 2 4-4",
  },
  {
    value: "cekRiwayat",
    label: "Cek Riwayat",
    icon: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3.5 3.5",
  },
];

export function HeroUtilityCard({
  goldPricePerGram,
  fitrahPricePerJiwa,
}: {
  goldPricePerGram: number;
  fitrahPricePerJiwa: number;
}) {
  const [tool, setTool] = useState<Tool>("kalkulator");
  const whatsapp = process.env.NEXT_PUBLIC_LAZSIP_WHATSAPP;
  const jemputMessage = encodeURIComponent(
    "Assalamu'alaikum, saya ingin menjadwalkan penjemputan zakat oleh tim LAZSIP."
  );

  return (
    <div className="flex min-h-[26rem] flex-col justify-between">
      <div>
        <div className="grid grid-cols-3 gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTool(t.value)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[11px] font-bold leading-tight transition-colors sm:text-xs ${
                tool === t.value
                  ? "bg-lazsip-primary-900 text-white shadow-[0_10px_25px_-10px_rgba(22,48,31,0.55)]"
                  : "bg-lazsip-primary-50 text-lazsip-primary-800/70 hover:bg-lazsip-primary-100"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tool === "kalkulator" && (
            <HeroZakatCalculator goldPricePerGram={goldPricePerGram} fitrahPricePerJiwa={fitrahPricePerJiwa} />
          )}
          {tool === "cekStatus" && <HeroCekStatus />}
          {tool === "cekRiwayat" && <HeroCekRiwayat />}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/50 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lazsip-primary-900 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l3-8h12l3 8M3 13v6a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-6M3 13h18M7 16.5h.01M17 16.5h.01" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-lazsip-primary-900">Layanan Jemput Zakat</p>
          <p className="mt-0.5 text-[11px] leading-snug text-lazsip-primary-800/60">
            Nominal besar? Tim kami siap jemput langsung, gratis.
          </p>
        </div>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${jemputMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Jadwalkan penjemputan zakat via WhatsApp"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.08 1-2.37.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.81 2 .88 2.15.07.15.12.32.02.52-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.37 1.47.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.7-.17 1.37z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
