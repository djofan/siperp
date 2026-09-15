type Icon = "fund" | "donors" | "beneficiaries" | "calendar";

const ICONS: Record<Icon, string> = {
  fund: "M12 3v18M7 7l5-4 5 4M6 12h12M6 17h12",
  donors:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5M14.5 14.8c3.5.3 5.5 2.6 5.5 5.2",
  beneficiaries:
    "M12 21s-7-4.35-9.5-8.8C.8 8.6 2.4 5 6 5c2 0 3.3 1 4 2.2C10.7 6 12 5 14 5c3.6 0 5.2 3.6 3.5 7.2C15 16.65 12 21 12 21z",
  calendar: "M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
};

export function StatCounter({
  value,
  label,
  icon = "fund",
  className = "",
}: {
  value: string;
  label: string;
  icon?: Icon;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-3xl bg-white p-4 sm:p-6 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lazsip-primary-50 text-lazsip-primary-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
      </span>
      <p
        className="mt-4 truncate text-xl font-extrabold leading-tight tracking-tight text-lazsip-primary-900 sm:text-2xl lg:text-[1.65rem]"
        title={value}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-sm text-lazsip-primary-800/60">{label}</p>
    </div>
  );
}
