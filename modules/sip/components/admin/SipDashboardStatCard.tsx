const ICONS: Record<string, string> = {
  pengurus: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5M14.5 14.8c3.5.3 5.5 2.6 5.5 5.2",
  program: "M4 4h11l5 5v11H4V4zM15 4v5h5",
  blog: "M9 12h6M9 16h6M9 8h6M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  kegiatan: "M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  mitra: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0zM9 20a4 4 0 0 1 8 0",
  laporan: "M9 12h6M9 16h3M9 3h6l3 3v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
};

export function SipDashboardStatCard({ icon, label, value, hint }: { icon: keyof typeof ICONS; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-sip-primary-100 bg-white p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sip-primary-50 text-sip-primary-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
      </span>
      <p className="mt-4 truncate text-xl font-extrabold tracking-tight text-sip-primary-900" title={value}>
        {value}
      </p>
      <p className="mt-1 truncate text-sm text-sip-primary-800/60">{label}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-sip-primary-800/45">{hint}</p>}
    </div>
  );
}
