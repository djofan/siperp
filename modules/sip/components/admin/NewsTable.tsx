"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SipToggle } from "@/modules/sip/components/admin/SipToggle";
import { SipRowActions } from "@/modules/sip/components/admin/SipRowActions";
import { SipViewToggle, type SipAdminViewMode } from "@/modules/sip/components/admin/SipViewToggle";
import {
  SipAdminFilterBar,
  SipAdminSearchInput,
  SipAdminFilterSelect,
  SipAdminFilterResetButton,
} from "@/modules/sip/components/admin/SipAdminFilterBar";
import { SipAdminEmptyState } from "@/modules/sip/components/admin/SipAdminEmptyState";
import { SipAdminBadge } from "@/modules/sip/components/admin/SipAdminBadge";
import { SipOverlayCard, SipOverlayActions } from "@/modules/sip/components/admin/SipAdminCardShell";
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

export function NewsTable({ news }: { news: NewsRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<SipAdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function saveChange(item: NewsRow, changes: Partial<NewsRow>) {
    setPendingIds((prev) => new Set(prev).add(item.id));
    await fetch(`/api/sip/news/${item.id}`, {
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
    await fetch(`/api/sip/news/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const filtered = useMemo(() => {
    let rows = news.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") rows = rows.filter((item) => item.status === statusFilter);
    return rows;
  }, [news, search, statusFilter]);

  return (
    <div>
      <SipAdminFilterBar>
        <SipAdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul berita..." />
        <SipAdminFilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filter status" />
        <SipAdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <SipViewToggle view={view} onChange={setView} />
        </div>
      </SipAdminFilterBar>

      {filtered.length === 0 ? (
        <SipAdminEmptyState message={news.length === 0 ? "Belum ada berita. Klik tombol di atas untuk menambah." : "Tidak ada berita yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-sip-primary-100 dark:border-white/10 bg-sip-primary-50/60 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-sip-primary-700/70 dark:text-white/55">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Pinned</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sip-primary-50 dark:divide-white/10">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-sip-primary-50/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={item.image} alt="" className="h-12 w-16 rounded-xl border border-sip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-sip-primary-50 dark:bg-white/10" />
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <SipToggle checked={item.isPinned} onChange={(v) => saveChange(item, { isPinned: v })} label="Pinned" disabled={pendingIds.has(item.id)} />
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-sip-primary-900 dark:text-white">{item.title}</td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => saveChange(item, { status: item.status === "published" ? "draft" : "published" })}
                        disabled={pendingIds.has(item.id)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          item.status === "published" ? "bg-sip-secondary-50 text-sip-secondary-700" : "bg-sip-primary-900/5 text-sip-primary-900/50 dark:text-white/50"
                        }`}
                      >
                        {item.status === "published" ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <SipRowActions
                        onEdit={() => router.push(`/admin/sip/berita/${item.id}`)}
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
            <SipOverlayCard
              key={item.id}
              image={item.image}
              title={item.title}
              onClick={() => router.push(`/admin/sip/berita/${item.id}`)}
              meta={
                <>
                  {item.isPinned && (
                    <SipAdminBadge tone="primary" size="sm">
                      Pinned
                    </SipAdminBadge>
                  )}
                  <SipAdminBadge tone={item.status === "published" ? "secondary" : "overlay"} size="sm">
                    {item.status === "published" ? "Published" : "Draft"}
                  </SipAdminBadge>
                </>
              }
              topRight={
                <SipOverlayActions
                  onEdit={() => router.push(`/admin/sip/berita/${item.id}`)}
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
