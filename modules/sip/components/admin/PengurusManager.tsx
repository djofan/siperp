"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { SipRowActions } from "@/modules/sip/components/admin/SipRowActions";
import { SipAdminEmptyState } from "@/modules/sip/components/admin/SipAdminEmptyState";
import { PENGURUS_LEVELS } from "@/modules/sip/api/pengurusLevels";

interface PengurusRow {
  id: string;
  name: string;
  position: string;
  level: string;
  photo: string | null;
  order: number;
}

const LEVEL_LABEL: Record<string, string> = {
  pembina: "Pembina",
  pengurus_inti: "Pengurus Inti",
  pengawas: "Pengawas",
  tim: "Tim",
};

const emptyForm = { name: "", position: "", level: "tim", photo: null as string | null, order: "0" };

export function PengurusManager({ pengurus }: { pengurus: PengurusRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(row: PengurusRow) {
    setEditingId(row.id);
    setForm({ name: row.name, position: row.position, level: row.level, photo: row.photo, order: String(row.order) });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = { ...form, order: Number(form.order) || 0 };
    const endpoint = editingId ? `/api/sip/pengurus/${editingId}` : "/api/sip/pengurus";
    const response = await fetch(endpoint, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan.");
      return;
    }

    cancelEdit();
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Hapus pengurus "${name}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/sip/pengurus/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-sip-primary-100 bg-white p-5">
        <h3 className="text-sm font-semibold text-sip-primary-900">{editingId ? "Edit Pengurus" : "Tambah Pengurus"}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-sip-primary-800/70">Nama</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-sip-primary-800/70">Jabatan</label>
            <input
              required
              value={form.position}
              onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-sip-primary-800/70">Level</label>
            <select
              value={form.level}
              onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none"
            >
              {PENGURUS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABEL[level]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-sip-primary-800/70">Urutan tampil</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>
        </div>
        <SipImageUploadField
          label="Foto (opsional)"
          initialUrl={form.photo}
          onChange={(url) => setForm((prev) => ({ ...prev, photo: url }))}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <SipLoadingButton type="submit" loading={isSubmitting}>
            {editingId ? "Simpan Perubahan" : "Tambah Pengurus"}
          </SipLoadingButton>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm font-medium text-sip-primary-700/70 hover:underline">
              Batal
            </button>
          )}
        </div>
      </form>

      {pengurus.length === 0 ? (
        <SipAdminEmptyState message="Belum ada data pengurus." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sip-primary-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-sip-primary-100 bg-sip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-sip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Foto</th>
                  <th className="px-4 py-3.5 font-semibold">Nama</th>
                  <th className="px-4 py-3.5 font-semibold">Jabatan</th>
                  <th className="px-4 py-3.5 font-semibold">Level</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sip-primary-50">
                {pengurus.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-sip-primary-50/40">
                    <td className="px-4 py-3.5">
                      {row.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin
                        <img src={row.photo} alt="" className="h-10 w-10 rounded-full border border-sip-primary-100/80 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-sip-primary-50" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-sip-primary-900">{row.name}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/60">{row.position}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/60">{LEVEL_LABEL[row.level] ?? row.level}</td>
                    <td className="px-4 py-3.5">
                      <SipRowActions onEdit={() => startEdit(row)} onDelete={() => handleDelete(row.id, row.name)} deleting={deletingId === row.id} />
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
