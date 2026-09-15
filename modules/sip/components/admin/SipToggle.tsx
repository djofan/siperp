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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-sip-primary-900" : "bg-sip-primary-100"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
