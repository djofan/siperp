"use client";

export function SipToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sip-lime/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-sip-lime" : "bg-white/15 hover:bg-white/20"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full shadow transition-transform duration-200 ${
          checked ? "translate-x-5.5 bg-sip-ink" : "translate-x-1 bg-white/80"
        }`}
      />
    </button>
  );
}
