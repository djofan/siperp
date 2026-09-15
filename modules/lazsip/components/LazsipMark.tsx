// Placeholder mark (belum ada aset logo resmi) — bentuk daun sederhana dengan warna
// brand LAZSIP, dibungkus lingkaran putih supaya konsisten dengan referensi tampilan.
export function LazsipMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-lazsip-primary-100 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <path
          d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"
          fill="var(--color-lazsip-secondary-500)"
        />
        <path
          d="M12 21c0-6 2-10 5-13"
          stroke="var(--color-lazsip-primary-900)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
