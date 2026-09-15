"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/components/lazsip/admin/ImageUploadField";
import { Toggle } from "@/components/lazsip/admin/Toggle";
import { LoadingButton } from "@/components/lazsip/admin/LoadingButton";

interface ActivityFormValues {
  title: string;
  description: string;
  image: string;
  date: string; // yyyy-mm-dd
  isPinned: boolean;
}

export function ActivityForm({
  activityId,
  initialValues,
}: {
  activityId?: string;
  initialValues?: Partial<ActivityFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!activityId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
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

    const url = activityId ? `/api/lazsip/activities/${activityId}` : "/api/lazsip/activities";
    const method = activityId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, image, isPinned, date }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan kegiatan.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/lazsip/kegiatan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="flex flex-col gap-5 rounded-3xl border border-lazsip-primary-100 bg-white p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Judul kegiatan"
              className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900">
              Deskripsi<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              required
              className="rounded-2xl border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
            />
          </div>

          <ImageUploadField label="Gambar Kegiatan" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-lazsip-primary-100 bg-white p-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-lazsip-primary-900">
                Tanggal<span className="ml-0.5 text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-4">
              <span className="text-sm font-medium text-lazsip-primary-900">Pin di halaman Kegiatan</span>
              <Toggle checked={isPinned} onChange={setIsPinned} label="Pin" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <LoadingButton type="submit" loading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Tambah Kegiatan"}
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
