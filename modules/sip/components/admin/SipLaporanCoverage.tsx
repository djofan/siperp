import Link from "next/link";
import { panelClasses } from "@/components/ui/panel";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Kelengkapan laporan bulanan 12 bulan terakhir — tujuannya biar admin langsung lihat
// bulan mana yang laporannya belum diunggah (transparansi ke donatur).
export function SipLaporanCoverage({
  months,
  lastYear,
  hasTahunanLastYear,
}: {
  months: { year: number; month: number; uploaded: boolean }[];
  lastYear: number;
  hasTahunanLastYear: boolean;
}) {
  const uploadedCount = months.filter((m) => m.uploaded).length;
  const missing = months.filter((m) => !m.uploaded);

  return (
    <div className={panelClasses("flex flex-col p-6")}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Laporan bulanan</h2>
        <span className="text-xs text-white/45">12 bulan terakhir</span>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">
        {uploadedCount}
        <span className="text-base font-semibold text-white/40">/12</span>
      </p>
      <p className="text-xs text-white/50">bulan sudah ada laporannya</p>

      <ul className="mt-5 grid grid-cols-6 gap-1.5" aria-label="Status laporan per bulan">
        {months.map((m) => (
          <li
            key={`${m.year}-${m.month}`}
            title={`${MONTH_SHORT[m.month - 1]} ${m.year}: ${m.uploaded ? "sudah diunggah" : "belum diunggah"}`}
            className={
              m.uploaded
                ? "flex flex-col items-center rounded-lg bg-sip-lime/90 py-1.5 text-sip-ink"
                : "flex flex-col items-center rounded-lg bg-white/[0.06] py-1.5 text-white/45"
            }
          >
            <span className="text-[11px] font-semibold">{MONTH_SHORT[m.month - 1]}</span>
            <span className="text-[10px] opacity-70">&apos;{String(m.year).slice(2)}</span>
            <span className="sr-only">{m.uploaded ? "sudah diunggah" : "belum diunggah"}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-1.5 text-xs">
        <p className={missing.length ? "text-amber-300" : "text-white/55"}>
          {missing.length
            ? `Belum ada: ${missing.map((m) => `${MONTH_SHORT[m.month - 1]} ${m.year}`).join(", ")}`
            : "Semua laporan bulanan lengkap."}
        </p>
        <p className={hasTahunanLastYear ? "text-white/55" : "text-amber-300"}>
          Laporan tahunan {lastYear}: {hasTahunanLastYear ? "sudah ada" : "belum diunggah"}
        </p>
      </div>

      <Link href="/admin/sip/laporan" className="mt-auto pt-4 text-xs font-semibold text-sip-lime hover:text-sip-lime-hover">
        Kelola laporan →
      </Link>
    </div>
  );
}
