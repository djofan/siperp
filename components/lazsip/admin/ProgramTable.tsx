"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationToggle } from "@/components/lazsip/admin/RegistrationToggle";
import { RowActions } from "@/components/lazsip/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/components/lazsip/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/components/lazsip/admin/AdminFilterBar";
import { AdminEmptyState } from "@/components/lazsip/admin/AdminEmptyState";
import { AdminBadge } from "@/components/lazsip/admin/AdminBadge";
import { AdminOverlayCard, AdminOverlayActions } from "@/components/lazsip/admin/AdminCardShell";

interface ProgramRow {
  id: string;
  title: string;
  description?: string;
  image: string | null;
  category: string;
  registrationOpen: boolean;
  isPinned?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  umum: "Umum",
  pendidikan: "Divisi Pendidikan",
  sarsip: "SARSIP",
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "Semua Kategori" },
  { value: "umum", label: "Umum" },
  { value: "pendidikan", label: "Divisi Pendidikan" },
  { value: "sarsip", label: "SARSIP" },
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
  const [categoryFilter, setCategoryFilter] = useState("all");
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
    setCategoryFilter("all");
    setRegistrationFilter("all");
  };

  const filtered = useMemo(() => {
    let rows = programs.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
    if (categoryFilter !== "all") rows = rows.filter((p) => p.category === categoryFilter);
    if (registrationFilter !== "all") {
      rows = rows.filter((p) => (registrationFilter === "open" ? p.registrationOpen : !p.registrationOpen));
    }
    return rows;
  }, [programs, search, categoryFilter, registrationFilter]);

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul program..." />
        <AdminFilterSelect value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} ariaLabel="Filter kategori" />
        <AdminFilterSelect value={registrationFilter} onChange={setRegistrationFilter} options={REGISTRATION_OPTIONS} ariaLabel="Filter pendaftaran" />
        <AdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message={programs.length === 0 ? "Belum ada program. Klik tombol di atas untuk menambah." : "Tidak ada program yang cocok dengan filter."} />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Kategori</th>
                  <th className="px-4 py-3.5 font-semibold">Pendaftaran</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {filtered.map((program) => (
                  <tr key={program.id} className="transition-colors hover:bg-lazsip-primary-50/40">
                    <td className="px-4 py-3.5">
                      {program.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={program.image} alt="" className="h-12 w-16 rounded-xl border border-lazsip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-lazsip-primary-50" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-lazsip-primary-900">{program.title}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{CATEGORY_LABEL[program.category] ?? program.category}</td>
                    <td className="px-4 py-3.5">
                      <RegistrationToggle programId={program.id} initialOpen={program.registrationOpen} />
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
                    {CATEGORY_LABEL[program.category] ?? program.category}
                  </AdminBadge>
                  <AdminBadge tone={program.registrationOpen ? "secondary" : "danger"} size="sm">
                    {program.registrationOpen ? "Terbuka" : "Ditutup"}
                  </AdminBadge>
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
