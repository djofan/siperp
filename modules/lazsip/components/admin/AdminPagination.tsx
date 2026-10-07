"use client";

import { useCallback } from "react";
import { usePersistedPreference } from "@/lib/usePersistedPreference";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";

const DEFAULT_PAGE_SIZE = 10;

const isPageValue = (value: string): value is string => /^[1-9]\d*$/.test(value);
const BOOLEAN_VALUES = ["true", "false"] as const;

// Halaman aktif & status pagination diingat per tabel (storageKey) supaya tidak reset saat refresh.
export function usePagination<T>(items: T[], storageKey: string, pageSize = DEFAULT_PAGE_SIZE) {
  const [pageValue, setPageValue] = usePersistedPreference<string>(`lazsip-admin:${storageKey}:page`, isPageValue, "1");
  const [enabledValue, setEnabledValue] = usePersistedPreference<(typeof BOOLEAN_VALUES)[number]>(
    `lazsip-admin:${storageKey}:pagination`,
    BOOLEAN_VALUES,
    "true"
  );
  const page = Number(pageValue);
  const enabled = enabledValue === "true";
  const setPage = useCallback((next: number) => setPageValue(String(Math.max(1, next))), [setPageValue]);
  const setEnabled = useCallback((next: boolean) => setEnabledValue(next ? "true" : "false"), [setEnabledValue]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Diklem ke pageCount terbaru (bukan di-reset paksa ke halaman 1) — biar kalau
  // hasil filter berubah dan halaman saat ini jadi kelewat, otomatis mentok ke
  // halaman terakhir yang valid tanpa perlu efek terpisah yang trigger render ganda.
  const safePage = Math.min(page, pageCount);
  const startIndex = enabled ? (safePage - 1) * pageSize : 0;
  const paginated = enabled ? items.slice(startIndex, startIndex + pageSize) : items;

  return { paginated, page: safePage, setPage, pageCount, enabled, setEnabled, startIndex };
}

export function AdminPaginationBar({
  enabled,
  onToggleEnabled,
  page,
  pageCount,
  onPageChange,
  totalCount,
}: {
  enabled: boolean;
  onToggleEnabled: (value: boolean) => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lazsip-primary-100 px-4 py-3 dark:border-white/10">
      <label className="flex items-center gap-2.5 text-xs font-medium text-lazsip-primary-800/70 dark:text-white/60">
        <Toggle checked={enabled} onChange={onToggleEnabled} label="Gunakan pagination" />
        Pagination {enabled ? "aktif" : "nonaktif"} · {totalCount} data
      </label>

      {enabled && pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-full border border-lazsip-primary-100 px-3 py-1.5 text-xs font-medium text-lazsip-primary-700 transition-colors hover:bg-lazsip-primary-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-lazsip-primary-800/60 dark:text-white/50">
            Halaman {page} dari {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className="rounded-full border border-lazsip-primary-100 px-3 py-1.5 text-xs font-medium text-lazsip-primary-700 transition-colors hover:bg-lazsip-primary-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
