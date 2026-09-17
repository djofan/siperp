import { panelClasses } from "@/components/ui/panel";

const ICONS: Record<string, string> = {
  program: "M4 4h11l5 5v11H4V4zM15 4v5h5",
  berita: "M9 12h6M9 16h6M9 8h6M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  penyaluran: "M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  laporan: "M9 12h6M9 16h3M9 3h6l3 3v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
};

export function SipDashboardStatCard({ icon, label, value, hint }: { icon: keyof typeof ICONS; label: string; value: string; hint?: string }) {
  return (
    <div className={panelClasses("p-5")}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sip-primary-50 text-sip-primary-700 dark:bg-white/10 dark:text-sip-primary-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
      </span>
      <p className="mt-4 truncate text-xl font-extrabold tracking-tight text-sip-primary-900 dark:text-white" title={value}>
        {value}
      </p>
      <p className="mt-1 truncate text-sm text-sip-primary-800/60 dark:text-white/55">{label}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-sip-primary-800/45 dark:text-white/35">{hint}</p>}
    </div>
  );
}
