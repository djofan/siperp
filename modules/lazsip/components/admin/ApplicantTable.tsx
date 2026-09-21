"use client";

import { useMemo, useState } from "react";
import { ApplicantStatusSelect } from "@/modules/lazsip/components/admin/ApplicantStatusSelect";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { panelClasses } from "@/components/ui/panel";

interface ApplicantRow {
  id: string;
  name: string;
  contact: string;
  status: string;
  program: { id: string; title: string };
}

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "baru", label: "Baru" },
  { value: "diproses", label: "Diproses" },
  { value: "diterima", label: "Diterima" },
  { value: "ditolak", label: "Ditolak" },
];

export function ApplicantTable({ applicants }: { applicants: ApplicantRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  const programOptions = useMemo(() => {
    const programs = Array.from(new Map(applicants.map((a) => [a.program.id, a.program.title])).entries());
    return [{ value: "all", label: "Semua Program" }, ...programs.map(([id, title]) => ({ value: id, label: title }))];
  }, [applicants]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setProgramFilter("all");
  };

  const filtered = useMemo(() => {
    let rows = applicants.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") rows = rows.filter((a) => a.status === statusFilter);
    if (programFilter !== "all") rows = rows.filter((a) => a.program.id === programFilter);
    return rows;
  }, [applicants, search, statusFilter, programFilter]);

  if (applicants.length === 0) {
    return <AdminEmptyState message="Belum ada pendaftar." />;
  }

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari nama pendaftar..." />
        <AdminFilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filter status" />
        <AdminFilterSelect value={programFilter} onChange={setProgramFilter} options={programOptions} ariaLabel="Filter program" />
        <AdminFilterResetButton onClick={resetFilters} />
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message="Tidak ada pendaftar yang cocok dengan filter." />
      ) : (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 dark:border-white/10 bg-lazsip-primary-50/60 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70 dark:text-white/55">
                  <th className="px-4 py-3.5 font-semibold">Nama</th>
                  <th className="px-4 py-3.5 font-semibold">Kontak</th>
                  <th className="px-4 py-3.5 font-semibold">Program</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50 dark:divide-white/10">
                {filtered.map((applicant) => (
                  <tr key={applicant.id} className="transition-colors hover:bg-lazsip-primary-50/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">{applicant.name}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">{applicant.contact}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">{applicant.program.title}</td>
                    <td className="px-4 py-3.5">
                      <ApplicantStatusSelect applicantId={applicant.id} initialStatus={applicant.status} />
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
