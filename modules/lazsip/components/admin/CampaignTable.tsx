"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "@/modules/lazsip/components/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/modules/lazsip/components/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import { AdminOverlayCard, AdminOverlayActions } from "@/modules/lazsip/components/admin/AdminCardShell";

interface CampaignRow {
  id: string;
  title: string;
  image: string | null;
  uniqueCode: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
  isPinned?: boolean;
}

const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "completed", label: "Selesai" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "progress", label: "Progress Tertinggi" },
  { value: "target", label: "Target Tertinggi" },
];

export function CampaignTable({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<AdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus campaign "${title}"? Riwayat donasi terkait juga akan hilang.`)) return;
    setDeletingId(id);
    const response = await fetch(`/api/lazsip/campaigns/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (response.ok) router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSort("newest");
  };

  const filtered = useMemo(() => {
    let rows = campaigns.filter(
      (c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.uniqueCode.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") rows = rows.filter((c) => c.status === statusFilter);
    if (sort === "progress") {
      rows = [...rows].sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount);
    } else if (sort === "target") {
      rows = [...rows].sort((a, b) => b.targetAmount - a.targetAmount);
    }
    return rows;
  }, [campaigns, search, statusFilter, sort]);

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul atau kode..." />
        <AdminFilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filter status" />
        <AdminFilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Urutkan" />
        <AdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message={campaigns.length === 0 ? "Belum ada campaign. Klik tombol di atas untuk menambah." : "Tidak ada campaign yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Kode</th>
                  <th className="px-4 py-3.5 font-semibold">Progress</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {filtered.map((campaign) => {
                  const percentage = Math.min(100, Math.round((campaign.currentAmount / campaign.targetAmount) * 100));
                  return (
                    <tr key={campaign.id} className="transition-colors hover:bg-lazsip-primary-50/40">
                      <td className="px-4 py-3.5">
                        {campaign.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                          <img src={campaign.image} alt="" className="h-12 w-16 rounded-xl border border-lazsip-primary-100/80 object-cover" />
                        ) : (
                          <div className="h-12 w-16 rounded-xl bg-lazsip-primary-50" />
                        )}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3.5 font-medium text-lazsip-primary-900">{campaign.title}</td>
                      <td className="px-4 py-3.5 text-lazsip-primary-800/60">{campaign.uniqueCode}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-lazsip-primary-100">
                            <div className="h-full rounded-full bg-lazsip-primary-700" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-xs text-lazsip-primary-800/50">{percentage}%</span>
                        </div>
                        <p className="mt-1 text-[11px] text-lazsip-primary-800/40">
                          {formatRupiah(campaign.currentAmount)} / {formatRupiah(campaign.targetAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            campaign.status === "active" ? "bg-lazsip-secondary-50 text-lazsip-secondary-700" : "bg-lazsip-primary-900/5 text-lazsip-primary-900/50"
                          }`}
                        >
                          {campaign.status === "active" ? "Aktif" : "Selesai"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <RowActions
                          onEdit={() => router.push(`/admin/lazsip/donasi/${campaign.id}`)}
                          onDelete={() => handleDelete(campaign.id, campaign.title)}
                          deleting={deletingId === campaign.id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((campaign) => {
            const percentage = Math.min(100, Math.round((campaign.currentAmount / campaign.targetAmount) * 100));
            return (
              <AdminOverlayCard
                key={campaign.id}
                image={campaign.image}
                title={campaign.title}
                onClick={() => router.push(`/admin/lazsip/donasi/${campaign.id}`)}
                meta={
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                        <div className="h-full rounded-full bg-white" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-[9px] font-bold text-white/80">{percentage}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <AdminBadge tone={campaign.status === "active" ? "secondary" : "overlay"} size="sm">
                        {campaign.status === "active" ? "Aktif" : "Selesai"}
                      </AdminBadge>
                      {campaign.isPinned && (
                        <AdminBadge tone="primary" size="sm">
                          Pinned
                        </AdminBadge>
                      )}
                    </div>
                  </div>
                }
                topRight={
                  <AdminOverlayActions
                    onEdit={() => router.push(`/admin/lazsip/donasi/${campaign.id}`)}
                    onDelete={() => handleDelete(campaign.id, campaign.title)}
                    deleting={deletingId === campaign.id}
                  />
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
