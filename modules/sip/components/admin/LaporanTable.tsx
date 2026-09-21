"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { MONTH_LABEL } from "@/modules/sip/components/format";

interface LaporanRow {
  id: string;
  title: string;
  type: string;
  periodMonth: number | null;
  periodYear: number;
  fileUrl: string;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Semua Tipe" },
  { value: "bulanan", label: "Bulanan" },
  { value: "tahunan", label: "Tahunan" },
];

function periodLabel(row: LaporanRow) {
  return row.type === "bulanan" ? `${MONTH_LABEL[(row.periodMonth ?? 1) - 1]} ${row.periodYear}` : String(row.periodYear);
}

export function LaporanTable({ laporan }: { laporan: LaporanRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<SipAdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus laporan "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/sip/laporan/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
  };

  const filtered = useMemo(() => {
    let rows = laporan.filter((row) => row.title.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "all") rows = rows.filter((row) => row.type === typeFilter);
    return rows;
  }, [laporan, search, typeFilter]);

  return (
    <div>
      <SipAdminFilterBar>
        <SipAdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul laporan..." />
        <SipAdminFilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} ariaLabel="Filter tipe" />
        <SipAdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <SipViewToggle view={view} onChange={setView} />
        </div>
      </SipAdminFilterBar>

      {filtered.length === 0 ? (
        <SipAdminEmptyState message={laporan.length === 0 ? "Belum ada laporan. Klik tombol di atas untuk menambah." : "Tidak ada laporan yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-sip-primary-100 dark:border-white/10 bg-sip-primary-50/60 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-sip-primary-700/70 dark:text-white/55">
                  <th className="px-4 py-3.5 font-semibold">Tipe</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Periode</th>
                  <th className="px-4 py-3.5 font-semibold">Tautan</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sip-primary-50 dark:divide-white/10">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-sip-primary-50/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5">
                      <SipAdminBadge tone={row.type === "bulanan" ? "secondary" : "primary"}>
                        {row.type === "bulanan" ? "Bulanan" : "Tahunan"}
                      </SipAdminBadge>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-sip-primary-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/60 dark:text-white/55">{periodLabel(row)}</td>
                    <td className="px-4 py-3.5">
                      <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sip-primary-700 dark:text-sip-primary-300 hover:underline">
                        Lihat Laporan
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <SipRowActions
                        onEdit={() => router.push(`/admin/sip/laporan/${row.id}`)}
                        onDelete={() => handleDelete(row.id, row.title)}
                        deleting={deletingId === row.id}
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
          {filtered.map((row) => (
            <SipOverlayCard
              key={row.id}
              image={null}
              title={row.title}
              onClick={() => router.push(`/admin/sip/laporan/${row.id}`)}
              meta={
                <>
                  <SipAdminBadge tone={row.type === "bulanan" ? "secondary" : "overlay"} size="sm">
                    {row.type === "bulanan" ? "Bulanan" : "Tahunan"}
                  </SipAdminBadge>
                  <SipAdminBadge tone="overlay" size="sm">
                    {periodLabel(row)}
                  </SipAdminBadge>
                </>
              }
              topRight={
                <SipOverlayActions
                  onEdit={() => router.push(`/admin/sip/laporan/${row.id}`)}
                  onDelete={() => handleDelete(row.id, row.title)}
                  deleting={deletingId === row.id}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
