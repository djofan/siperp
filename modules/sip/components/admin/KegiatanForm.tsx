"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";

interface KegiatanFormValues {
  title: string;
  description: string;
  image: string;
  date: string; // yyyy-mm-dd
}

export function KegiatanForm({
  kegiatanId,
  initialValues,
}: {
  kegiatanId?: string;
  initialValues?: Partial<KegiatanFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!kegiatanId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && !image) {
      setError("Gambar kegiatan wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    const url = kegiatanId ? `/api/sip/kegiatan/${kegiatanId}` : "/api/sip/kegiatan";
    const method = kegiatanId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, image, date }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan kegiatan.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/sip/kegiatan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="flex flex-col gap-5 rounded-3xl border border-sip-primary-100 bg-white p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Judul kegiatan"
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Deskripsi<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              required
              className="rounded-2xl border border-sip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <SipImageUploadField label="Gambar Kegiatan" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-sip-primary-100 bg-white p-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-sip-primary-900">
                Tanggal<span className="ml-0.5 text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <SipLoadingButton type="submit" loading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Tambah Kegiatan"}
          </SipLoadingButton>
        </div>
      </div>
    </form>
  );
}
