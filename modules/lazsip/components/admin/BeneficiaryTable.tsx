"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "@/modules/lazsip/components/admin/RowActions";
import { ViewToggle, type AdminViewMode } from "@/modules/lazsip/components/admin/ViewToggle";
import { AdminFilterBar, AdminSearchInput, AdminFilterSelect, AdminFilterResetButton } from "@/modules/lazsip/components/admin/AdminFilterBar";
import { AdminEmptyState } from "@/modules/lazsip/components/admin/AdminEmptyState";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import { AdminOverlayCard, AdminOverlayActions } from "@/modules/lazsip/components/admin/AdminCardShell";
import { panelClasses } from "@/components/ui/panel";

interface BeneficiaryRow {
  id: string;
  name: string;
  photo: string | null;
  aidType: string;
  amountReceived: number;
  verifierName?: string;
  verifierArea?: string;
  createdAt?: Date;
  isPinned?: boolean;
}

const AID_TYPE_LABEL: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  kebutuhan_pokok: "Kebutuhan Pokok",
  lainnya: "Lainnya",
};

const AID_TYPE_OPTIONS = [
  { value: "all", label: "Semua Tipe Bantuan" },
  { value: "pendidikan", label: "Pendidikan" },
  { value: "kesehatan", label: "Kesehatan" },
  { value: "kebutuhan_pokok", label: "Kebutuhan Pokok" },
  { value: "lainnya", label: "Lainnya" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "amount", label: "Nominal Tertinggi" },
];

export function BeneficiaryTable({ beneficiaries }: { beneficiaries: BeneficiaryRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<AdminViewMode>("list");
  const [search, setSearch] = useState("");
  const [aidTypeFilter, setAidTypeFilter] = useState("all");
  const [verifierAreaFilter, setVerifierAreaFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const verifierAreaOptions = useMemo(() => {
    const areas = Array.from(new Set(beneficiaries.map((b) => b.verifierArea).filter((v): v is string => Boolean(v)))).sort();
    return [{ value: "all", label: "Semua Wilayah" }, ...areas.map((a) => ({ value: a, label: a }))];
  }, [beneficiaries]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Hapus data penerima manfaat "${name}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/lazsip/beneficiaries/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const resetFilters = () => {
    setSearch("");
    setAidTypeFilter("all");
    setVerifierAreaFilter("all");
    setSort("newest");
  };

  const filtered = useMemo(() => {
    let rows = beneficiaries.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
    if (aidTypeFilter !== "all") rows = rows.filter((b) => b.aidType === aidTypeFilter);
    if (verifierAreaFilter !== "all") rows = rows.filter((b) => b.verifierArea === verifierAreaFilter);
    if (sort === "amount") rows = [...rows].sort((a, b) => b.amountReceived - a.amountReceived);
    return rows;
  }, [beneficiaries, search, aidTypeFilter, verifierAreaFilter, sort]);

  if (beneficiaries.length === 0) {
    return <AdminEmptyState message="Belum ada data. Klik tombol di atas untuk menambah." />;
  }

  return (
    <div>
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Cari nama penerima..." />
        <AdminFilterSelect value={aidTypeFilter} onChange={setAidTypeFilter} options={AID_TYPE_OPTIONS} ariaLabel="Filter tipe bantuan" />
        <AdminFilterSelect value={verifierAreaFilter} onChange={setVerifierAreaFilter} options={verifierAreaOptions} ariaLabel="Filter wilayah verifikator" />
        <AdminFilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Urutkan" />
        <AdminFilterResetButton onClick={resetFilters} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <AdminEmptyState message="Tidak ada data yang cocok dengan filter." />
      ) : view === "list" ? (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 dark:border-white/10 bg-lazsip-primary-50/60 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70 dark:text-white/55">
                  <th className="px-4 py-3.5 font-semibold">Foto</th>
                  <th className="px-4 py-3.5 font-semibold">Pinned</th>
                  <th className="px-4 py-3.5 font-semibold">Nama</th>
                  <th className="px-4 py-3.5 font-semibold">Tipe Bantuan</th>
                  <th className="px-4 py-3.5 font-semibold">Verifikator</th>
                  <th className="px-4 py-3.5 font-semibold">Jumlah Diterima</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50 dark:divide-white/10">
                {filtered.map((beneficiary) => (
                  <tr key={beneficiary.id} className="transition-colors hover:bg-lazsip-primary-50/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5">
                      {beneficiary.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={beneficiary.photo} alt="" className="h-10 w-10 rounded-full border border-lazsip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-lazsip-primary-50 dark:bg-white/10 dark:bg-white/10"/>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">{beneficiary.isPinned ? "✓" : "-"}</td>
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">{beneficiary.name}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">{AID_TYPE_LABEL[beneficiary.aidType] ?? beneficiary.aidType}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">
                      {beneficiary.verifierName}
                      {beneficiary.verifierArea && <span className="text-lazsip-primary-800/40 dark:text-white/30"> · {beneficiary.verifierArea}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">Rp{beneficiary.amountReceived.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        onEdit={() => router.push(`/admin/lazsip/penyaluran-bantuan/${beneficiary.id}`)}
                        onDelete={() => handleDelete(beneficiary.id, beneficiary.name)}
                        deleting={deletingId === beneficiary.id}
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
          {filtered.map((beneficiary) => (
            <AdminOverlayCard
              key={beneficiary.id}
              image={beneficiary.photo}
              title={beneficiary.name}
              onClick={() => router.push(`/admin/lazsip/penyaluran-bantuan/${beneficiary.id}`)}
              meta={
                <>
                  {beneficiary.isPinned && (
                    <AdminBadge tone="primary" size="sm">
                      Pinned
                    </AdminBadge>
                  )}
                  <AdminBadge tone="overlay" size="sm">
                    {AID_TYPE_LABEL[beneficiary.aidType] ?? beneficiary.aidType}
                  </AdminBadge>
                  <AdminBadge tone="secondary" size="sm">
                    Rp{beneficiary.amountReceived.toLocaleString("id-ID")}
                  </AdminBadge>
                </>
              }
              topRight={
                <AdminOverlayActions
                  onEdit={() => router.push(`/admin/lazsip/penyaluran-bantuan/${beneficiary.id}`)}
                  onDelete={() => handleDelete(beneficiary.id, beneficiary.name)}
                  deleting={deletingId === beneficiary.id}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
