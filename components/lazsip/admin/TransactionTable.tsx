"use client";

import { useMemo, useState } from "react";
import { TransactionActions } from "@/components/lazsip/admin/TransactionActions";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminDateInput, AdminFilterResetButton } from "@/components/lazsip/admin/AdminFilterBar";
import { AdminEmptyState } from "@/components/lazsip/admin/AdminEmptyState";
import { AdminBadge } from "@/components/lazsip/admin/AdminBadge";

export interface TransactionRow {
  id: string;
  type: "donasi" | "zakat";
  label: string;
  donorName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
const formatDateTime = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);

const STATUS_LABEL: Record<string, string> = { pending: "Menunggu", paid: "Lunas", failed: "Gagal" };
const STATUS_TONE: Record<string, "neutral" | "secondary" | "danger"> = { pending: "neutral", paid: "secondary", failed: "danger" };

const TYPE_OPTIONS = [
  { value: "all", label: "Semua Jenis" },
  { value: "donasi", label: "Donasi" },
  { value: "zakat", label: "Zakat" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Lunas" },
  { value: "failed", label: "Gagal" },
];

function toCsv(rows: TransactionRow[]) {
  const header = ["Jenis", "Donatur", "Nominal", "Metode", "Waktu", "Status"];
  const lines = rows.map((row) =>
    [row.type, row.donorName, row.amount, row.paymentMethod, row.createdAt.toISOString(), row.status]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function TransactionTable({ rows }: { rows: TransactionRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const methodOptions = useMemo(() => {
    const methods = Array.from(new Set(rows.map((r) => r.paymentMethod))).sort();
    return [{ value: "all", label: "Semua Metode" }, ...methods.map((m) => ({ value: m, label: m }))];
  }, [rows]);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = useMemo(() => {
    let result = rows.filter(
      (r) => r.donorName.toLowerCase().includes(search.toLowerCase()) || r.label.toLowerCase().includes(search.toLowerCase())
    );
    if (typeFilter !== "all") result = result.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (methodFilter !== "all") result = result.filter((r) => r.paymentMethod === methodFilter);
    if (dateFrom) result = result.filter((r) => r.createdAt >= new Date(dateFrom));
    if (dateTo) result = result.filter((r) => r.createdAt <= new Date(`${dateTo}T23:59:59`));
    return result;
  }, [rows, search, typeFilter, statusFilter, methodFilter, dateFrom, dateTo]);

  function handleExport() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transaksi-lazsip-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return <AdminEmptyState message="Belum ada transaksi." />;
  }

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari donatur/campaign..." />
        <AdminFilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} ariaLabel="Filter jenis" />
        <AdminFilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filter status" />
        <AdminFilterSelect value={methodFilter} onChange={setMethodFilter} options={methodOptions} ariaLabel="Filter metode pembayaran" />
        <AdminDateInput value={dateFrom} onChange={setDateFrom} ariaLabel="Dari tanggal" />
        <AdminDateInput value={dateTo} onChange={setDateTo} ariaLabel="Sampai tanggal" />
        <AdminFilterResetButton onClick={resetFilters} />
        <button
          type="button"
          onClick={handleExport}
          className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Export CSV
        </button>
      </AdminFilterBar>

      <p className="mb-2 text-xs text-lazsip-primary-800/50">Menampilkan {filtered.length} dari {rows.length} transaksi.</p>

      {filtered.length === 0 ? (
        <AdminEmptyState message="Tidak ada transaksi yang cocok dengan filter." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Jenis</th>
                  <th className="px-4 py-3.5 font-semibold">Donatur</th>
                  <th className="px-4 py-3.5 font-semibold">Nominal</th>
                  <th className="px-4 py-3.5 font-semibold">Metode</th>
                  <th className="px-4 py-3.5 font-semibold">Waktu</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {filtered.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="transition-colors hover:bg-lazsip-primary-50/40">
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900">{row.label}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{row.donorName}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{formatRupiah(row.amount)}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{row.paymentMethod}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/50">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <AdminBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {row.status === "pending" && <TransactionActions id={row.id} type={row.type} />}
                    </td>
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
