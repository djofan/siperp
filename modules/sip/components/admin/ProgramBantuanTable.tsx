"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SipRowActions } from "@/modules/sip/components/admin/SipRowActions";
import { SipViewToggle, type SipAdminViewMode } from "@/modules/sip/components/admin/SipViewToggle";
import { SipAdminFilterBar, SipAdminSearchInput, SipAdminFilterResetButton } from "@/modules/sip/components/admin/SipAdminFilterBar";
import { SipAdminEmptyState } from "@/modules/sip/components/admin/SipAdminEmptyState";
import { SipAdminBadge } from "@/modules/sip/components/admin/SipAdminBadge";
import { SipOverlayCard, SipOverlayActions } from "@/modules/sip/components/admin/SipAdminCardShell";
import { staticPanelClasses } from "@/components/ui/panel";

interface ProgramBantuanRow {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  isPinned: boolean;
}

export function ProgramBantuanTable({ programs }: { programs: ProgramBantuanRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<SipAdminViewMode>("list");
  const [search, setSearch] = useState("");

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus program "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/sip/program-bantuan/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const filtered = useMemo(
    () => programs.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
    [programs, search]
  );

  if (programs.length === 0) {
    return <SipAdminEmptyState message="Belum ada program bantuan. Klik tombol di atas untuk menambah." />;
  }

  return (
    <div>
      <SipAdminFilterBar>
        <SipAdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul program..." />
        <SipAdminFilterResetButton onClick={() => setSearch("")} />
        <div className="ml-auto">
          <SipViewToggle view={view} onChange={setView} />
        </div>
      </SipAdminFilterBar>

      {filtered.length === 0 ? (
        <SipAdminEmptyState message="Tidak ada program yang cocok dengan pencarian." />
      ) : view === "list" ? (
        <div className={staticPanelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-sip-primary-100 bg-sip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-sip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Slug</th>
                  <th className="px-4 py-3.5 font-semibold">Pinned</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sip-primary-50">
                {filtered.map((program) => (
                  <tr key={program.id} className="transition-colors hover:bg-sip-primary-50/40">
                    <td className="px-4 py-3.5">
                      {program.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={program.image} alt="" className="h-12 w-16 rounded-xl border border-sip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-sip-primary-50" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-sip-primary-900">{program.title}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/50">{program.slug}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/60">{program.isPinned ? "✓" : "-"}</td>
                    <td className="px-4 py-3.5">
                      <SipRowActions
                        onEdit={() => router.push(`/admin/sip/program-bantuan/${program.id}`)}
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
            <SipOverlayCard
              key={program.id}
              image={program.image}
              title={program.title}
              onClick={() => router.push(`/admin/sip/program-bantuan/${program.id}`)}
              meta={program.isPinned ? <SipAdminBadge tone="primary" size="sm">Pinned</SipAdminBadge> : undefined}
              topRight={
                <SipOverlayActions
                  onEdit={() => router.push(`/admin/sip/program-bantuan/${program.id}`)}
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
