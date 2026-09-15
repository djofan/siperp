"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "@/components/lazsip/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/components/lazsip/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminFilterResetButton } from "@/components/lazsip/admin/AdminFilterBar";
import { AdminEmptyState } from "@/components/lazsip/admin/AdminEmptyState";
import { AdminOverlayCard, AdminOverlayActions } from "@/components/lazsip/admin/AdminCardShell";

interface PartnerRow {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
}

export function PartnerTable({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<AdminViewMode>("list");
  const [search, setSearch] = useState("");

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Hapus mitra "${name}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/lazsip/partners/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const filtered = useMemo(
    () => partners.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [partners, search]
  );

  if (partners.length === 0) {
    return <AdminEmptyState message="Belum ada mitra. Klik tombol di atas untuk menambah." />;
  }

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari nama mitra..." />
        <AdminFilterResetButton onClick={() => setSearch("")} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message="Tidak ada mitra yang cocok dengan pencarian." />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 bg-lazsip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Logo</th>
                  <th className="px-4 py-3.5 font-semibold">Nama</th>
                  <th className="px-4 py-3.5 font-semibold">Website</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {filtered.map((partner) => (
                  <tr key={partner.id} className="transition-colors hover:bg-lazsip-primary-50/40">
                    <td className="px-4 py-3.5">
                      {partner.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={partner.logo} alt="" className="h-10 w-10 rounded-full border border-lazsip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-lazsip-primary-50" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900">{partner.name}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60">{partner.url ?? "-"}</td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        onEdit={() => router.push(`/admin/lazsip/mitra/${partner.id}`)}
                        onDelete={() => handleDelete(partner.id, partner.name)}
                        deleting={deletingId === partner.id}
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
          {filtered.map((partner) => (
            <AdminOverlayCard
              key={partner.id}
              image={partner.logo}
              title={partner.name}
              onClick={() => router.push(`/admin/lazsip/mitra/${partner.id}`)}
              topRight={
                <AdminOverlayActions
                  onEdit={() => router.push(`/admin/lazsip/mitra/${partner.id}`)}
                  onDelete={() => handleDelete(partner.id, partner.name)}
                  deleting={deletingId === partner.id}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
