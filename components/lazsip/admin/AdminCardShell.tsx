export function AdminOverlayCard({
  image,
  title,
  onClick,
  meta,
  topRight,
}: {
  image: string | null;
  title: string;
  onClick?: () => void;
  meta?: React.ReactNode;
  topRight?: React.ReactNode;
}) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-lazsip-primary-800">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-lazsip-primary-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14M4 6h16v12H4V6z" />
            <circle cx="9" cy="9" r="1.5" />
          </svg>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

      {topRight && <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">{topRight}</div>}

      <button type="button" onClick={onClick} className="absolute inset-0 flex flex-col justify-end p-2.5 text-left">
        {meta && <div className="mb-1 flex flex-wrap gap-1">{meta}</div>}
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{title}</p>
      </button>
    </div>
  );
}

export function AdminOverlayActions({
  onEdit,
  onDelete,
  deleting = false,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <>
      {onEdit && (
        <AdminOverlayIconButton onClick={onEdit} label="Edit" disabled={deleting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            />
          </svg>
        </AdminOverlayIconButton>
      )}
      {onDelete && (
        <AdminOverlayIconButton onClick={onDelete} label="Hapus" disabled={deleting} tone="danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12z" />
          </svg>
        </AdminOverlayIconButton>
      )}
    </>
  );
}

export function AdminOverlayIconButton({
  onClick,
  label,
  disabled,
  tone = "light",
  children,
}: {
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  tone?: "light" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "danger" ? "text-red-300 hover:bg-red-500/60 hover:text-white" : "text-white hover:bg-white/25"
      }`}
    >
      {children}
    </button>
  );
}
