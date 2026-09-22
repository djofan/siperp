"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";
import { RowActions } from "@/modules/lazsip/components/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/modules/lazsip/components/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import { AdminOverlayCard, AdminOverlayActions } from "@/modules/lazsip/components/admin/AdminCardShell";
import { panelClasses } from "@/components/ui/panel";

interface NewsRow {
  id: string;
  title: string;
  content: string;
  image: string | null;
  isPinned: boolean;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const PINNED_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "pinned", label: "Pinned" },
  { value: "unpinned", label: "Tidak Pinned" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "title", label: "Judul A-Z" },
];

export function NewsTable({ news }: { news: NewsRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<AdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pinnedFilter, setPinnedFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  async function saveChange(item: NewsRow, changes: Partial<NewsRow>) {
    setPendingIds((prev) => new Set(prev).add(item.id));
    await fetch(`/api/lazsip/news/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, ...changes }),
    });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    router.refresh();
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus berita "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/lazsip/news/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPinnedFilter("all");
    setSort("newest");
  };

  const filtered = useMemo(() => {
    let rows = news.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") rows = rows.filter((item) => item.status === statusFilter);
    if (pinnedFilter !== "all") rows = rows.filter((item) => (pinnedFilter === "pinned" ? item.isPinned : !item.isPinned));
    if (sort === "title") rows = [...rows].sort((a, b) => a.title.localeCompare(b.title));
    return rows;
  }, [news, search, statusFilter, pinnedFilter, sort]);

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul berita..." />
        <AdminFilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filter status" />
        <AdminFilterSelect value={pinnedFilter} onChange={setPinnedFilter} options={PINNED_OPTIONS} ariaLabel="Filter pin" />
        <AdminFilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Urutkan" />
        <AdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message={news.length === 0 ? "Belum ada berita. Klik tombol di atas untuk menambah." : "Tidak ada berita yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Pinned</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50 dark:divide-white/5">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-lazsip-primary-50/40 dark:hover:bg-white/3">
                    <td className="px-4 py-3.5">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={item.image} alt="" className="h-12 w-16 rounded-xl border border-lazsip-primary-100/80 object-cover dark:border-white/10" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-lazsip-primary-50 dark:bg-white/10" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">{item.title}</td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => saveChange(item, { status: item.status === "published" ? "draft" : "published" })}
                        disabled={pendingIds.has(item.id)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          item.status === "published"
                            ? "bg-lazsip-secondary-50 text-lazsip-secondary-700 dark:bg-lazsip-secondary-900/40 dark:text-lazsip-secondary-300"
                            : "bg-lazsip-primary-900/5 text-lazsip-primary-900/50 dark:bg-white/10 dark:text-white/60"
                        }`}
                      >
                        {item.status === "published" ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <Toggle checked={item.isPinned} onChange={(v) => saveChange(item, { isPinned: v })} label="Pinned" disabled={pendingIds.has(item.id)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        onEdit={() => router.push(`/admin/lazsip/berita/${item.id}`)}
                        onDelete={() => handleDelete(item.id, item.title)}
                        deleting={deletingId === item.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((item) => (
            <AdminOverlayCard
              key={item.id}
              image={item.image}
              title={item.title}
              onClick={() => router.push(`/admin/lazsip/berita/${item.id}`)}
              meta={
                <>
                  <AdminBadge tone={item.status === "published" ? "secondary" : "overlay"} size="sm">
                    {item.status === "published" ? "Published" : "Draft"}
                  </AdminBadge>
                  {item.isPinned && (
                    <AdminBadge tone="primary" size="sm">
                      Pinned
                    </AdminBadge>
                  )}
                </>
              }
              topRight={
                <AdminOverlayActions
                  onEdit={() => router.push(`/admin/lazsip/berita/${item.id}`)}
                  onDelete={() => handleDelete(item.id, item.title)}
                  deleting={deletingId === item.id}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
