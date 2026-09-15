"use client";

import { useState } from "react";
import { HeroZakatCalculator } from "@/modules/lazsip/components/sections/HeroZakatCalculator";
import { HeroCekStatus } from "@/modules/lazsip/components/sections/HeroCekStatus";

type Tool = "kalkulator" | "cekStatus";

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
];

export function HeroUtilityCard({
  goldPricePerGram,
  fitrahPricePerJiwa,
}: {
  goldPricePerGram: number;
  fitrahPricePerJiwa: number;
}) {
  const [tool, setTool] = useState<Tool>("kalkulator");

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTool(t.value)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-bold transition-colors sm:text-sm ${
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
        {tool === "kalkulator" ? (
          <HeroZakatCalculator goldPricePerGram={goldPricePerGram} fitrahPricePerJiwa={fitrahPricePerJiwa} />
        ) : (
          <HeroCekStatus />
        )}
      </div>
    </div>
  );
}
