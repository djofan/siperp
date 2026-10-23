import { panelClasses } from "@/components/ui/panel";

const ICONS: Record<string, string> = {
  fund: "M12 3v18M7 7l5-4 5 4M6 12h12M6 17h12",
  zakat: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z",
  donors: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5M14.5 14.8c3.5.3 5.5 2.6 5.5 5.2",
  campaign: "M4 4h11l5 5v11H4V4zM15 4v5h5",
  beneficiaries: "M12 21s-7-4.35-9.5-8.8C.8 8.6 2.4 5 6 5c2 0 3.3 1 4 2.2C10.7 6 12 5 14 5c3.6 0 5.2 3.6 3.5 7.2C15 16.65 12 21 12 21z",
  partners: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0zM9 20a4 4 0 0 1 8 0",
  pending: "M12 8v4l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  applicant: "M9 12h6M9 16h6M9 8h6M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
};

export function DashboardStatCard({
  icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: keyof typeof ICONS;
  label: string;
  value: string;
  hint?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className={panelClasses("p-5")}>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lazsip-primary-50 text-lazsip-primary-700 dark:bg-white/10 dark:text-lazsip-primary-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
          </svg>
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              trend.value >= 0
                ? "bg-lazsip-secondary-50 text-lazsip-secondary-700 dark:bg-lazsip-secondary-900/40 dark:text-lazsip-secondary-300"
                : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            }`}
          >
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p
        className="mt-4 truncate text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white"
        title={value}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-sm text-lazsip-primary-800/60 dark:text-white/55">{label}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-lazsip-primary-800/45 dark:text-white/35">{hint}</p>}
      {trend && (
        <p className="mt-0.5 truncate text-xs text-lazsip-primary-800/45 dark:text-white/35">{trend.label}</p>
      )}
    </div>
  );
}
