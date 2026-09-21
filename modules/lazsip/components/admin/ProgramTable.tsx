"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationToggle } from "@/modules/lazsip/components/admin/RegistrationToggle";
import { RowActions } from "@/modules/lazsip/components/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/modules/lazsip/components/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import { AdminOverlayCard, AdminOverlayActions } from "@/modules/lazsip/components/admin/AdminCardShell";
import { panelClasses } from "@/components/ui/panel";

interface ProgramRow {
  id: string;
  title: string;
  description?: string;
  image: string | null;
  type: string;
  registrationOpen: boolean;
  isPinned?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  berita: "Berita",
  daftar: "Pendaftaran",
};

const TYPE_OPTIONS = [
  { value: "all", label: "Semua Tipe" },
  { value: "berita", label: "Berita" },
  { value: "daftar", label: "Pendaftaran" },
];

const REGISTRATION_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "open", label: "Pendaftaran Terbuka" },
  { value: "closed", label: "Pendaftaran Ditutup" },
];

export function ProgramTable({ programs }: { programs: ProgramRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<AdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] = useState("all");

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus program "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/lazsip/programs/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setRegistrationFilter("all");
  };

  const filtered = useMemo(() => {
    let rows = programs.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "all") rows = rows.filter((p) => p.type === typeFilter);
    if (registrationFilter !== "all") {
      rows = rows.filter((p) => (registrationFilter === "open" ? p.registrationOpen : !p.registrationOpen));
    }
    return rows;
  }, [programs, search, typeFilter, registrationFilter]);

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul program..." />
        <AdminFilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} ariaLabel="Filter tipe" />
        <AdminFilterSelect value={registrationFilter} onChange={setRegistrationFilter} options={REGISTRATION_OPTIONS} ariaLabel="Filter pendaftaran" />
        <AdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message={programs.length === 0 ? "Belum ada program. Klik tombol di atas untuk menambah." : "Tidak ada program yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 dark:border-white/10 bg-lazsip-primary-50/60 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70 dark:text-white/55">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Tipe</th>
                  <th className="px-4 py-3.5 font-semibold">Pendaftaran</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50 dark:divide-white/10">
                {filtered.map((program) => (
                  <tr key={program.id} className="transition-colors hover:bg-lazsip-primary-50/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5">
                      {program.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={program.image} alt="" className="h-12 w-16 rounded-xl border border-lazsip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-lazsip-primary-50 dark:bg-white/10 dark:bg-white/10"/>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">{program.title}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">{TYPE_LABEL[program.type] ?? program.type}</td>
                    <td className="px-4 py-3.5">
                      {program.type === "daftar" ? (
                        <RegistrationToggle programId={program.id} initialOpen={program.registrationOpen} />
                      ) : (
                        <span className="text-xs text-lazsip-primary-800/40 dark:text-white/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        onEdit={() => router.push(`/admin/lazsip/program/${program.id}`)}
                        onDelete={() => handleDelete(program.id, program.title)}
                        deleting={deletingId === program.id}
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
          {filtered.map((program) => (
            <AdminOverlayCard
              key={program.id}
              image={program.image}
              title={program.title}
              onClick={() => router.push(`/admin/lazsip/program/${program.id}`)}
              meta={
                <>
                  <AdminBadge tone="overlay" size="sm">
                    {TYPE_LABEL[program.type] ?? program.type}
                  </AdminBadge>
                  {program.type === "daftar" && (
                    <AdminBadge tone={program.registrationOpen ? "secondary" : "danger"} size="sm">
                      {program.registrationOpen ? "Terbuka" : "Ditutup"}
                    </AdminBadge>
                  )}
                  {program.isPinned && (
                    <AdminBadge tone="primary" size="sm">
                      Pinned
                    </AdminBadge>
                  )}
                </>
              }
              topRight={
                <AdminOverlayActions
                  onEdit={() => router.push(`/admin/lazsip/program/${program.id}`)}
                  onDelete={() => handleDelete(program.id, program.title)}
                  deleting={deletingId === program.id}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
