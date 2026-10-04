"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { panelClasses } from "@/components/ui/panel";
import { MONTH_LABEL } from "@/modules/sip/components/format";

interface LaporanFormValues {
  title: string;
  type: string;
  periodMonth: string;
  periodYear: string;
  fileUrl: string;
}

const emptyForm: LaporanFormValues = {
  title: "",
  type: "bulanan",
  periodMonth: "1",
  periodYear: String(new Date().getFullYear()),
  fileUrl: "",
};

export function LaporanForm({
  laporanId,
  initialValues,
}: {
  laporanId?: string;
  initialValues?: Partial<LaporanFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!laporanId;
  const [form, setForm] = useState<LaporanFormValues>({ ...emptyForm, ...initialValues });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const endpoint = laporanId ? `/api/sip/laporan/${laporanId}` : "/api/sip/laporan";
    const response = await fetch(endpoint, {
      method: laporanId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/sip/laporan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className={panelClasses("p-6 sm:p-8")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">
              Judul<span className="ml-0.5 text-red-400">*</span>
            </label>
            <input
              required
              placeholder="mis. Laporan Keuangan SIP"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="h-10 rounded-full bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">Tipe</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="h-10 rounded-full bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60"
              >
                <option value="bulanan">Bulanan</option>
                <option value="tahunan">Tahunan</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">
                Tahun<span className="ml-0.5 text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                value={form.periodYear}
                onChange={(e) => setForm((prev) => ({ ...prev, periodYear: e.target.value }))}
                className="h-10 rounded-full bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60"
              />
            </div>
          </div>

          {form.type === "bulanan" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white">Bulan</label>
              <select
                value={form.periodMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, periodMonth: e.target.value }))}
                className="h-10 w-full rounded-full bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60 sm:w-1/2"
              >
                {MONTH_LABEL.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">
              Tautan Laporan (Google Drive, dll) atau Upload PDF<span className="ml-0.5 text-red-400">*</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                required
                placeholder="https://drive.google.com/..."
                value={form.fileUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                className="h-10 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sip-lime/60"
              />
              <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 focus-within:ring-2 focus-within:ring-sip-lime/60">
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
      </div>

      <div className="flex flex-col-reverse items-center justify-end gap-4 sm:flex-row">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <SipLoadingButton type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          {isEdit ? "Simpan Perubahan" : "Tambah Laporan"}
        </SipLoadingButton>
      </div>
    </form>
  );
}
