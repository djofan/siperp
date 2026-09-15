"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SipRowActions } from "@/modules/sip/components/admin/SipRowActions";
import { SipViewToggle, type SipAdminViewMode } from "@/modules/sip/components/admin/SipViewToggle";
import { SipAdminFilterBar, SipAdminSearchInput, SipAdminFilterResetButton } from "@/modules/sip/components/admin/SipAdminFilterBar";
import { SipAdminEmptyState } from "@/modules/sip/components/admin/SipAdminEmptyState";
import { SipAdminBadge } from "@/modules/sip/components/admin/SipAdminBadge";
import { SipOverlayCard, SipOverlayActions } from "@/modules/sip/components/admin/SipAdminCardShell";

interface KegiatanRow {
  id: string;
  title: string;
  image: string | null;
  date: Date;
}

const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);

export function KegiatanTable({ kegiatan }: { kegiatan: KegiatanRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<SipAdminViewMode>("list");
  const [search, setSearch] = useState("");

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus kegiatan "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/sip/kegiatan/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const filtered = useMemo(
    () => kegiatan.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())),
    [kegiatan, search]
  );

  if (kegiatan.length === 0) {
    return <SipAdminEmptyState message="Belum ada kegiatan. Klik tombol di atas untuk menambah." />;
  }

  return (
    <div>
      <SipAdminFilterBar>
        <SipAdminSearchInput value={search} onChange={setSearch} placeholder="Cari judul kegiatan..." />
        <SipAdminFilterResetButton onClick={() => setSearch("")} />
        <div className="ml-auto">
          <SipViewToggle view={view} onChange={setView} />
        </div>
      </SipAdminFilterBar>

      {filtered.length === 0 ? (
        <SipAdminEmptyState message="Tidak ada kegiatan yang cocok dengan pencarian." />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-sip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-sip-primary-100 bg-sip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-sip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Thumbnail</th>
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Tanggal</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sip-primary-50">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-sip-primary-50/40">
                    <td className="px-4 py-3.5">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={item.image} alt="" className="h-12 w-16 rounded-xl border border-sip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-xl bg-sip-primary-50" />
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 font-medium text-sip-primary-900">{item.title}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/60">{formatDate(item.date)}</td>
                    <td className="px-4 py-3.5">
                      <SipRowActions
                        onEdit={() => router.push(`/admin/sip/kegiatan/${item.id}`)}
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
              onClick={() => router.push(`/admin/sip/kegiatan/${item.id}`)}
              meta={<SipAdminBadge tone="overlay" size="sm">{formatDate(item.date)}</SipAdminBadge>}
              topRight={
                <SipOverlayActions
                  onEdit={() => router.push(`/admin/sip/kegiatan/${item.id}`)}
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
