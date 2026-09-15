// Placeholder mark (belum ada aset logo resmi) — bentuk rumah/naungan sederhana dengan
// warna brand SIP, dibungkus lingkaran putih. Sengaja berbeda bentuk dari LazsipMark
// (daun) supaya SIP sebagai portal induk tetap punya identitas visual sendiri.
export function SipMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-sip-primary-100 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <path d="M4 11.5 12 4l8 7.5" stroke="var(--color-sip-primary-900)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M6 10.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.5"
          fill="var(--color-sip-secondary-500)"
          fillOpacity={0.18}
          stroke="var(--color-sip-primary-900)"
          strokeWidth={1.4}
        />
        <circle cx="12" cy="15" r="2" fill="var(--color-sip-accent)" />
      </svg>
    </span>
  );
}
