"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import type { DonorSummary } from "@/modules/lazsip/api/donors";
import { panelClasses } from "@/components/ui/panel";

const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);

const SEGMENT_OPTIONS = [
  { value: "all", label: "Semua Segmen" },
  { value: "infaq", label: "Donatur Infaq/Donasi" },
  { value: "zakat", label: "Muzakki Zakat" },
];

const SORT_OPTIONS = [
  { value: "total", label: "Donatur Terbesar (Total Kontribusi)" },
  { value: "frequent", label: "Donatur Rajin (Paling Sering)" },
  { value: "recent", label: "Transaksi Terakhir" },
];

export function DonorTable({ donors, showSegmentFilter = true }: { donors: DonorSummary[]; showSegmentFilter?: boolean }) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [sort, setSort] = useState("total");

  const resetFilters = () => {
    setSearch("");
    setSegment("all");
    setSort("total");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = donors.filter(
      (d) => d.name.toLowerCase().includes(q) || d.phone?.includes(search) || d.email?.toLowerCase().includes(q)
    );
    if (showSegmentFilter && segment !== "all") rows = rows.filter((d) => d.types.some((type) => type === segment));
    rows = [...rows].sort((a, b) => {
      if (sort === "recent") return b.lastContributionAt.getTime() - a.lastContributionAt.getTime();
      if (sort === "frequent") return b.contributionCount - a.contributionCount;
      return b.totalContribution - a.totalContribution;
    });
    return rows;
  }, [donors, search, segment, sort, showSegmentFilter]);

  if (donors.length === 0) {
    return <AdminEmptyState message="Belum ada data donatur." />;
  }

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari nama, WhatsApp, atau email..." />
        {showSegmentFilter && (
          <AdminFilterSelect value={segment} onChange={setSegment} options={SEGMENT_OPTIONS} ariaLabel="Filter segmen" />
        )}
        <AdminFilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Urutkan" />
        <AdminFilterResetButton onClick={resetFilters} />
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message="Tidak ada donatur yang cocok dengan filter." />
      ) : (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
                  <th className="px-4 py-3.5 font-semibold">Nama</th>
                  <th className="px-4 py-3.5 font-semibold">Nomor WhatsApp</th>
                  <th className="px-4 py-3.5 font-semibold">Email</th>
                  <th className="px-4 py-3.5 font-semibold">Segmen</th>
                  <th className="px-4 py-3.5 font-semibold">Jumlah Transaksi</th>
                  <th className="px-4 py-3.5 font-semibold">Total Lunas</th>
                  <th className="px-4 py-3.5 font-semibold">Transaksi Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50 dark:divide-white/5">
                {filtered.map((donor) => (
                  <tr key={donor.id} className="transition-colors hover:bg-lazsip-primary-50/40 dark:hover:bg-white/3">
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">
                      <Link href={`/admin/lazsip/donatur/${donor.id}`} className="hover:underline">
                        {donor.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/60">{donor.phone ? `+${donor.phone}` : "Belum tercatat"}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/60">{donor.email ?? "Belum tercatat"}</td>
                    <td className="px-4 py-3.5">
                      {donor.types.map((type) => (
                        <AdminBadge key={type} tone={type === "zakat" ? "primary" : "secondary"}>
                          {type === "zakat" ? "Muzakki" : "Donatur"}
                        </AdminBadge>
                      ))}
                    </td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/60">{donor.contributionCount}x</td>
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">{formatRupiah(donor.totalContribution)}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/60">{formatDate(donor.lastContributionAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
