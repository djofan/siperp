"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { SipRowActions } from "@/modules/sip/components/admin/SipRowActions";
import { SipAdminEmptyState } from "@/modules/sip/components/admin/SipAdminEmptyState";
import { SipAdminBadge } from "@/modules/sip/components/admin/SipAdminBadge";
import { staticPanelClasses } from "@/components/ui/panel";

interface LaporanRow {
  id: string;
  title: string;
  type: string;
  periodMonth: number | null;
  periodYear: number;
  fileUrl: string;
}

const MONTH_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const emptyForm = { title: "", type: "bulanan", periodMonth: "1", periodYear: String(new Date().getFullYear()), fileUrl: "" };

export function LaporanManager({ laporan }: { laporan: LaporanRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(row: LaporanRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      type: row.type,
      periodMonth: String(row.periodMonth ?? 1),
      periodYear: String(row.periodYear),
      fileUrl: row.fileUrl,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleUploadPdf(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/sip/upload", { method: "POST", body: formData });
    setUploading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal mengunggah file.");
      return;
    }
    const data = await response.json();
    setForm((prev) => ({ ...prev, fileUrl: data.url }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = { ...form, periodMonth: Number(form.periodMonth), periodYear: Number(form.periodYear) };
    const endpoint = editingId ? `/api/sip/laporan/${editingId}` : "/api/sip/laporan";
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

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus laporan "${title}"?`)) return;
    setDeletingId(id);
    await fetch(`/api/sip/laporan/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className={staticPanelClasses("p-6 sm:p-8")}>
        <h3 className="text-sm font-semibold text-sip-primary-900">{editingId ? "Edit Laporan" : "Tambah Laporan"}</h3>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-sip-primary-900">Judul</label>
            <input
              required
              placeholder="mis. Laporan Keuangan SIP"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">Tipe</label>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none"
            >
              <option value="bulanan">Bulanan</option>
              <option value="tahunan">Tahunan</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">Tahun</label>
            <input
              type="number"
              required
              value={form.periodYear}
              onChange={(e) => setForm((prev) => ({ ...prev, periodYear: e.target.value }))}
              className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>
          {form.type === "bulanan" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-sip-primary-900">Bulan</label>
              <select
                value={form.periodMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, periodMonth: e.target.value }))}
                className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none"
              >
                {MONTH_LABEL.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-sip-primary-900">Tautan Laporan (Google Drive, dll) atau Upload PDF</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                required
                placeholder="https://drive.google.com/..."
                value={form.fileUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                className="h-10 flex-1 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
              />
              <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-sip-primary-200 px-4 text-sm font-semibold text-sip-primary-800 transition-colors hover:border-sip-primary-400">
                {uploading ? "Mengunggah..." : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleUploadPdf(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex items-center gap-3 border-t border-sip-primary-100 pt-6">
          <SipLoadingButton type="submit" loading={isSubmitting}>
            {editingId ? "Simpan Perubahan" : "Tambah Laporan"}
          </SipLoadingButton>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm font-medium text-sip-primary-700/70 hover:underline">
              Batal
            </button>
          )}
        </div>
      </form>

      {laporan.length === 0 ? (
        <SipAdminEmptyState message="Belum ada laporan." />
      ) : (
        <div className={staticPanelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-sip-primary-100 bg-sip-primary-50/60 text-[11px] font-semibold uppercase tracking-wider text-sip-primary-700/70">
                  <th className="px-4 py-3.5 font-semibold">Judul</th>
                  <th className="px-4 py-3.5 font-semibold">Periode</th>
                  <th className="px-4 py-3.5 font-semibold">Tipe</th>
                  <th className="px-4 py-3.5 font-semibold">Tautan</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sip-primary-50">
                {laporan.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-sip-primary-50/40">
                    <td className="px-4 py-3.5 font-medium text-sip-primary-900">{row.title}</td>
                    <td className="px-4 py-3.5 text-sip-primary-800/60">
                      {row.type === "bulanan" ? `${MONTH_LABEL[(row.periodMonth ?? 1) - 1]} ${row.periodYear}` : row.periodYear}
                    </td>
                    <td className="px-4 py-3.5">
                      <SipAdminBadge tone={row.type === "bulanan" ? "secondary" : "primary"}>
                        {row.type === "bulanan" ? "Bulanan" : "Tahunan"}
                      </SipAdminBadge>
                    </td>
                    <td className="px-4 py-3.5">
                      <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sip-primary-700 hover:underline">
                        Lihat Laporan
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <SipRowActions onEdit={() => startEdit(row)} onDelete={() => handleDelete(row.id, row.title)} deleting={deletingId === row.id} />
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
