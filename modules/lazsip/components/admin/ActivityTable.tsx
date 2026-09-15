"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "@/modules/lazsip/components/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/modules/lazsip/components/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminDateInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import { AdminOverlayCard, AdminOverlayActions } from "@/modules/lazsip/components/admin/AdminCardShell";

interface ActivityRow {
  id: string;
  title: string;
  description?: string;
  image: string | null;
  date: Date;
  isPinned: boolean;
}

const PINNED_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "pinned", label: "Pinned" },
  { value: "unpinned", label: "Tidak Pinned" },
];

const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);

export function ActivityTable({ activities }: { activities: ActivityRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<AdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [pinnedFilter, setPinnedFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus kegiatan "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/lazsip/activities/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setPinnedFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = useMemo(() => {
    let rows = activities.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));
    if (pinnedFilter !== "all") rows = rows.filter((a) => (pinnedFilter === "pinned" ? a.isPinned : !a.isPinned));
    if (dateFrom) rows = rows.filter((a) => a.date >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((a) => a.date <= new Date(`${dateTo}T23:59:59`));
    return rows;
  }, [activities, search, pinnedFilter, dateFrom, dateTo]);

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul kegiatan..." />
        <AdminFilterSelect value={pinnedFilter} onChange={setPinnedFilter} options={PINNED_OPTIONS} ariaLabel="Filter pin" />
        <AdminDateInput value={dateFrom} onChange={setDateFrom} ariaLabel="Dari tanggal" />
        <AdminDateInput value={dateTo} onChange={setDateTo} ariaLabel="Sampai tanggal" />
        <AdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message={activities.length === 0 ? "Belum ada kegiatan. Klik tombol di atas untuk menambah." : "Tidak ada kegiatan yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Tanggal</th>
                  <th className="px-4 py-3.5 font-semibold">Pin</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {filtered.map((activity) => (
                  <tr key={activity.id} className="transition-colors hover:bg-lazsip-primary-50/40">
                    <td className="px-4 py-3.5">
                      {activity.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={activity.image} alt="" className="h-12 w-16 rounded-xl border border-lazsip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-lazsip-primary-50" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-lazsip-primary-900">{activity.title}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{formatDate(activity.date)}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{activity.isPinned ? "✓" : "-"}</td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        onEdit={() => router.push(`/admin/lazsip/kegiatan/${activity.id}`)}
                        onDelete={() => handleDelete(activity.id, activity.title)}
                        deleting={deletingId === activity.id}
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
          {filtered.map((activity) => (
            <AdminOverlayCard
              key={activity.id}
              image={activity.image}
              title={activity.title}
              onClick={() => router.push(`/admin/lazsip/kegiatan/${activity.id}`)}
              meta={
                <>
                  <AdminBadge tone="overlay" size="sm">
                    {formatDate(activity.date)}
                  </AdminBadge>
                  {activity.isPinned && (
                    <AdminBadge tone="primary" size="sm">
                      Pinned
                    </AdminBadge>
                  )}
                </>
              }
              topRight={
                <AdminOverlayActions
                  onEdit={() => router.push(`/admin/lazsip/kegiatan/${activity.id}`)}
                  onDelete={() => handleDelete(activity.id, activity.title)}
                  deleting={deletingId === activity.id}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
