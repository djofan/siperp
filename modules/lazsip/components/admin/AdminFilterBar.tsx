"use client";

export function AdminFilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2.5">{children}</div>;
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Cari...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-45 flex-1 sm:max-w-xs">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lazsip-primary-400 dark:text-white/40"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-lazsip-primary-100 bg-white pl-9 pr-4 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-lazsip-primary-500"
      />
    </div>
  );
}

export function AdminFilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 shrink-0 rounded-full border border-lazsip-primary-100 bg-white px-4 text-sm font-medium text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-[#16191a] dark:text-white dark:focus:ring-lazsip-primary-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-white text-lazsip-primary-900 dark:bg-[#16191a] dark:text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function AdminDateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 shrink-0 rounded-full border border-lazsip-primary-100 bg-white px-4 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-[#16191a] dark:text-white dark:scheme-dark dark:focus:ring-lazsip-primary-500"
    />
  );
}

export function AdminFilterResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 shrink-0 rounded-full border border-lazsip-primary-100 bg-white px-4 text-sm font-medium text-lazsip-primary-700/70 transition-colors hover:bg-lazsip-primary-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
    >
      Reset Filter
    </button>
  );
}
