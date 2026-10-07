"use client";

import { usePersistedPreference } from "@/lib/usePersistedPreference";

// Filter/urutan tabel admin diingat per tabel supaya tidak balik ke default saat refresh.
// Nilai tersimpan yang sudah tidak ada di opsi (mis. data sudah dihapus) kembali ke fallback.
export function useSipAdminFilter(key: string, options: { value: string }[], fallback = "all") {
  return usePersistedPreference<string>(`sip-admin:${key}`, options.map((option) => option.value), fallback);
}

const isDateValue = (value: string): value is string => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);

export function useSipAdminDateFilter(key: string) {
  return usePersistedPreference<string>(`sip-admin:${key}`, isDateValue, "");
}

export function SipAdminFilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex items-center gap-2.5 overflow-x-auto px-0.5 py-1 [scrollbar-width:none]">{children}</div>;
}

export function SipAdminSearchInput({
  value,
  onChange,
  placeholder = "Cari...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60"
      />
    </div>
  );
}

export function SipAdminFilterSelect({
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
      className="h-10 shrink-0 rounded-full bg-white/5 px-4 text-sm font-medium text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function SipAdminFilterResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 shrink-0 rounded-full bg-white/5 px-4 text-sm font-medium text-white/55 transition-colors hover:bg-white/10"
    >
      Reset Filter
    </button>
  );
}
