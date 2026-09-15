"use client";

export type SipAdminViewMode = "list" | "grid";

export function SipViewToggle({ view, onChange }: { view: SipAdminViewMode; onChange: (view: SipAdminViewMode) => void }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sip-primary-100 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="Tampilan list"
        aria-pressed={view === "list"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          view === "list" ? "bg-sip-primary-900 text-white" : "text-sip-primary-700/50 hover:bg-sip-primary-50"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Tampilan grid"
        aria-pressed={view === "grid"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          view === "grid" ? "bg-sip-primary-900 text-white" : "text-sip-primary-700/50 hover:bg-sip-primary-50"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      </button>
    </div>
  );
}
