"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { staticPanelClasses } from "@/components/ui/panel";

interface PenyaluranBantuanFormValues {
  title: string;
  description: string;
  image: string;
  location: string;
  date: string; // yyyy-mm-dd
}

export function PenyaluranBantuanForm({
  itemId,
  initialValues,
}: {
  itemId?: string;
  initialValues?: Partial<PenyaluranBantuanFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!itemId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && !image) {
      setError("Gambar dokumentasi wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    const url = itemId ? `/api/sip/penyaluran-bantuan/${itemId}` : "/api/sip/penyaluran-bantuan";
    const method = itemId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, image, location, date }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan data penyaluran bantuan.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/sip/penyaluran-bantuan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className={staticPanelClasses("p-6 sm:p-8")}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Judul penyaluran bantuan"
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">Lokasi</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Mis. Cianjur, Jawa Barat"
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-sip-primary-900">
              Deskripsi<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
              className="rounded-2xl border border-sip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

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

          <div className="sm:col-span-2">
            <SipImageUploadField label="Gambar Dokumentasi" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-center justify-end gap-4 sm:flex-row">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <SipLoadingButton type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          {isEdit ? "Simpan Perubahan" : "Tambah Penyaluran Bantuan"}
        </SipLoadingButton>
      </div>
    </form>
  );
}
