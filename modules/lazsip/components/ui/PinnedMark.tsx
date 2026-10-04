// Penanda item yang disematkan admin — lingkaran putih kecil + ikon pin bulat solid.
// Dirender DI DALAM baris atas kartu featured (bukan ditempel absolut dari luar), supaya
// selalu sejajar dengan chip lain di pojok kartu dan tidak pernah bertabrakan.
export function PinnedMark() {
  return (
    <span
      title="Disematkan admin"
      aria-label="Disematkan"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90 text-lazsip-primary-600 shadow-sm backdrop-blur-sm"
    >
      {/* Siluet paku pines solid (kepala + badan + jarum), dimiringkan 45° — bukan ikon lokasi. */}
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 rotate-45" aria-hidden>
        <path
          fill="currentColor"
          d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
        />
        <path d="M12 17v5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
    </span>
  );
}
