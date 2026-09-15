"use client";

export function RowActions({
  onEdit,
  onDelete,
  deleting = false,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={deleting}
          aria-label="Edit"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lazsip-primary-700 transition-colors hover:bg-lazsip-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Hapus"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12z" />
          </svg>
        </button>
      )}
    </div>
  );
}
